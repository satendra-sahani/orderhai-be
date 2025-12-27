// src/controllers/cartController.ts (or wherever this file lives)
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

// Small counter collection for atomic orderId increments
const orderCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "order" },
    seq: { type: Number, default: 1000 },
  },
  { collection: "order_counters" }
);

const OrderCounter =
  mongoose.models.OrderCounter ||
  mongoose.model("OrderCounter", orderCounterSchema);

// Generate unique ORDER<number> using atomic increment
const generateOrderCode = async () => {
  const counter = await OrderCounter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const nextNumber = counter.seq;
  return `ORDER${nextNumber}`;
};

// Helper to calculate totals from items
const calcTotals = items => {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const deliveryFee = subtotal >= 199 ? 0 : 20; // same rule as FE banner
  const total = subtotal + deliveryFee;
  return { subtotal, deliveryFee, total };
};

// GET /api/cart
export const getCart = async (req, res) => {
  const userId = req.user.id;
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  res.json(cart);
};

// POST /api/cart  { productId, qty, variantName? }
export const addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, qty = 1, variantName } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const price = product.sellingPrice;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  const existing = cart.items.find(
    it => it.product.toString() === productId && it.variantName === variantName
  );

  if (existing) {
    existing.qty += Number(qty);
  } else {
    cart.items.push({
      product: product._id,
      name: product.name,
      price,
      qty,
      variantName,
    });
  }

  await cart.save();
  res.json(cart);
};

// PATCH /api/cart/:productId  body { qty, variantName? }
export const updateCartItem = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { qty, variantName } = req.body;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const item = cart.items.find(
    it => it.product.toString() === productId && it.variantName === variantName
  );
  if (!item) {
    return res.status(404).json({ message: "Item not in cart" });
  }

  if (qty <= 0) {
    cart.items = cart.items.filter(
      it => !(it.product.toString() === productId && it.variantName === variantName)
    );
  } else {
    item.qty = qty;
  }

  await cart.save();
  res.json(cart);
};

// DELETE /api/cart/:productId  (optional variantName in body)
export const removeFromCart = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { variantName } = req.body || {};

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  cart.items = cart.items.filter(
    it => !(it.product.toString() === productId && it.variantName === variantName)
  );

  await cart.save();
  res.json(cart);
};

// DELETE /api/cart – clear cart
export const clearCart = async (req, res) => {
  const userId = req.user.id;
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { new: true }
  );
  res.json(cart || { user: userId, items: [] });
};

// POST /api/orders  body: { items, paymentMethod, address, phone, name, notes, location }
export const createOrder = async (req, res) => {
  const userId = req.user?.id;
  const { items, paymentMethod, address, phone, name, notes, location } =
    req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Items required" });
  }
  if (!address) return res.status(400).json({ message: "Address required" });
  if (!phone) return res.status(400).json({ message: "Phone required" });

  const { subtotal, deliveryFee, total } = calcTotals(items);

  // parse lat,lng from location or address
  let lat;
  let lng;

  if (location && typeof location.lat === "number" && typeof location.lng === "number") {
    lat = location.lat;
    lng = location.lng;
  } else {
    const match = String(address).match(
      /([-+]?[0-9]*\.?[0-9]+)[,\s]+([-+]?[0-9]*\.?[0-9]+)/
    );
    if (match) {
      lat = parseFloat(match[1]);
      lng = parseFloat(match[2]);
    }
  }

  // unique orderId
  const orderId = await generateOrderCode();

  const order = await Order.create({
    user: userId || undefined,
    name,
    phone,
    address,
    notes,
    items,
    subtotal,
    deliveryFee,
    orderId,
    total,
    paymentMethod: paymentMethod || "COD",
    lat,
    lng,
    status: "PENDING",
    paymentMode: paymentMethod === "ONLINE" ? "ONLINE" : "CASH",
    shopPrice: 0,
    shopMargin: 0,
    shopPaid: false,
    timeline: { createdAt: new Date() },
  });

  if (userId) {
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
  }

  res.status(201).json(order);
};

// GET /api/orders/my
export const getMyOrders = async (req, res) => {
  const userId = req.user.id;
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  res.json(orders);
};

// POST /api/orders/:id/cancel
export const cancelOrder = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const order = await Order.findOne({ _id: id, user: userId });
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order already cancelled" });
  }

  // 5-minute cancel window
  const createdAt = order.createdAt.getTime();
  const now = Date.now();
  const diffMinutes = (now - createdAt) / (1000 * 60);

  if (diffMinutes > 5) {
    return res
      .status(400)
      .json({ message: "Order can only be cancelled within 5 minutes" });
  }

  order.status = "CANCELLED";
  order.cancelledAt = new Date();
  order.cancelledReason = "User requested cancellation within 5 minutes";
  await order.save();

  res.json(order);
};
