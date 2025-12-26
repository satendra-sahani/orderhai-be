// File: models/Order.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: String,
    price: Number,
    qty: { type: Number, required: true, min: 1 },
    variantName: String,
  },
  { _id: false }
);

const orderTimelineSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, required: true, default: Date.now },
    assignedShopAt: Date,
    assignedDeliveryAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // allow guest orders
    },
    phone: { type: String, required: true },
    name: { type: String },
    address: { type: String, required: true },
    notes: { type: String },

    // NEW: store customer coordinates on order (parsed once from FE)
    lat: { type: Number },
    lng: { type: Number },

    items: [cartItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    orderId: { type: String, unique: true },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },

    // ADMIN FIELDS (for dashboard)
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    deliveryBoy: {
      type: String, // simple name string
      default: null,
    },

    shopPrice: { type: Number, default: 0 },
    shopMargin: { type: Number, default: 0 },
    shopPaid: { type: Boolean, default: false },

    paymentMode: {
      type: String,
      enum: ["CASH", "ONLINE", "UPI"],
      default: "CASH",
    },

    couponCode: { type: String },
    offerPrice: { type: Number },

    otp: { type: String },

    timeline: {
      type: orderTimelineSchema,
      default: () => ({ createdAt: new Date() }),
    },

    cancelledAt: Date,
    cancelledReason: String,
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
