import { User } from "../models/User.js"
import { Product } from "../models/Product.js"
import { Order } from "../models/Order.js"
import { Invoice } from "../models/Invoice.js"
import { Cart } from "../models/Cart.js"
import mongoose from "mongoose"

// Invoice counter for atomic increments
const invoiceCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "invoice" },
    seq: { type: Number, default: 1000 },
  },
  { collection: "invoice_counters" }
)

const InvoiceCounter =
  mongoose.models.InvoiceCounter ||
  mongoose.model("InvoiceCounter", invoiceCounterSchema)

const generateInvoiceNumber = async () => {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { _id: "invoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean()
  return `INV-${counter.seq}`
}

// Order counter (same as orderController)
const orderCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "order" },
    seq: { type: Number, default: 1000 },
  },
  { collection: "order_counters" }
)

const OrderCounter =
  mongoose.models.OrderCounter ||
  mongoose.model("OrderCounter", orderCounterSchema)

const generateOrderCode = async () => {
  const counter = await OrderCounter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean()
  return `ORDER${counter.seq}`
}

// POST /api/auth/register-distributor
export const registerDistributor = async (req, res) => {
  try {
    const { phone, businessName, gstin, territory } = req.body

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" })
    }
    if (!businessName) {
      return res.status(400).json({ message: "Business name is required" })
    }

    const existing = await User.findOne({ phone })
    if (existing) {
      return res
        .status(409)
        .json({ message: "Phone number already registered" })
    }

    const user = await User.create({
      phone,
      role: "distributor",
      distributorProfile: {
        businessName,
        gstin: gstin || "",
        territory: territory || "",
        isApproved: false,
        creditLimit: 0,
        creditUsed: 0,
      },
    })

    res.status(201).json({
      message: "Distributor registration submitted, pending approval",
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        distributorProfile: user.distributorProfile,
      },
    })
  } catch (err) {
    console.error("registerDistributor error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/distributor/profile
export const getDistributorProfile = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const profile = user.distributorProfile
    const profileObj = profile && typeof profile.toObject === "function"
      ? profile.toObject()
      : (profile || {})
    const available = (profileObj.creditLimit || 0) - (profileObj.creditUsed || 0)

    res.json({
      id: user._id,
      phone: user.phone,
      name: user.name,
      distributorProfile: {
        ...profileObj,
        creditAvailable: available,
      },
    })
  } catch (err) {
    console.error("getDistributorProfile error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PUT /api/distributor/profile
export const updateDistributorProfile = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const { businessName, gstin, name } = req.body
    if (businessName !== undefined)
      user.distributorProfile.businessName = businessName
    if (gstin !== undefined) user.distributorProfile.gstin = gstin
    if (name !== undefined) user.name = name

    await user.save()
    res.json({ message: "Profile updated", distributorProfile: user.distributorProfile })
  } catch (err) {
    console.error("updateDistributorProfile error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/distributor/products
export const getB2BProducts = async (req, res) => {
  try {
    const { search, category } = req.query
    const filter = { inStock: true }

    if (search) {
      filter.name = { $regex: search, $options: "i" }
    }
    if (category) {
      filter.category = category
    }

    const products = await Product.find(filter)
      .select("-shopPrice")
      .sort({ name: 1 })
      .lean()

    // Transform variants to show b2bPrice, hide shopPrice
    const b2bProducts = products.map((p) => ({
      ...p,
      variants: (p.variants || []).map((v) => ({
        _id: v._id,
        name: v.name,
        sku: v.sku,
        b2bPrice: v.b2bPrice || v.sellingPrice,
        stock: v.stock,
        minB2BQty: v.minB2BQty || 1,
      })),
    }))

    res.json(b2bProducts)
  } catch (err) {
    console.error("getB2BProducts error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/distributor/orders
export const createB2BOrder = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const profile = user.distributorProfile
    if (!profile || !profile.isApproved) {
      return res
        .status(403)
        .json({ message: "Distributor account not yet approved" })
    }

    const { items, address, notes, deliverySlot, deliveryDate } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" })
    }

    // Resolve products and calculate totals using b2bPrice
    const productIds = items.map((it) => it.product)
    const products = await Product.find({ _id: { $in: productIds } }).lean()
    const productMap = {}
    products.forEach((p) => {
      productMap[p._id.toString()] = p
    })

    let subtotal = 0
    const orderItems = []
    const invoiceItems = []

    for (const item of items) {
      const product = productMap[item.product]
      if (!product) {
        return res
          .status(400)
          .json({ message: `Product ${item.product} not found` })
      }

      let unitPrice = product.sellingPrice
      // If variant specified, use variant b2bPrice
      if (item.variant && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(
          (v) => v.name === item.variant || v._id?.toString() === item.variant
        )
        if (variant) {
          unitPrice = variant.b2bPrice || variant.sellingPrice
          // Check min B2B quantity
          if (item.qty < (variant.minB2BQty || 1)) {
            return res.status(400).json({
              message: `Minimum quantity for ${product.name} (${variant.name}) is ${variant.minB2BQty}`,
            })
          }
        }
      }

      const lineTotal = unitPrice * item.qty
      subtotal += lineTotal

      orderItems.push({
        product: product._id,
        name: product.name,
        price: unitPrice,
        qty: item.qty,
        variantName: item.variant,
      })

      // GST at 5% for dairy products
      const gstRate = 0.05
      const gstAmount = Math.round(lineTotal * gstRate * 100) / 100

      invoiceItems.push({
        product: product._id,
        name: product.name,
        variant: item.variant,
        qty: item.qty,
        unitPrice,
        total: lineTotal,
        gst: gstAmount,
      })
    }

    // Check credit limit
    const available = profile.creditLimit - profile.creditUsed
    if (subtotal > available) {
      return res.status(400).json({
        message: `Insufficient credit. Available: ₹${available}, Order total: ₹${subtotal}`,
      })
    }

    const orderId = await generateOrderCode()

    const gstTotal = invoiceItems.reduce((sum, it) => sum + it.gst, 0)
    const grandTotal = subtotal + gstTotal

    // Create order
    const order = await Order.create({
      user: user._id,
      phone: user.phone,
      name: user.name || profile.businessName,
      address: address || profile.territory || profile.businessName || "B2B Order",
      notes,
      items: orderItems,
      subtotal,
      deliveryFee: 0,
      total: grandTotal,
      orderId,
      paymentMethod: profile.paymentTerms === "COD" ? "COD" : "ONLINE",
      orderType: "B2B",
      deliverySlot,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      status: "CONFIRMED",
      timeline: { createdAt: new Date() },
    })

    // Generate invoice
    const invoiceNumber = await generateInvoiceNumber()

    // Calculate due date based on payment terms
    let dueDate = new Date()
    switch (profile.paymentTerms) {
      case "NET_7":
        dueDate.setDate(dueDate.getDate() + 7)
        break
      case "NET_15":
        dueDate.setDate(dueDate.getDate() + 15)
        break
      case "NET_30":
        dueDate.setDate(dueDate.getDate() + 30)
        break
      default:
        dueDate = undefined
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      order: order._id,
      distributor: user._id,
      items: invoiceItems,
      subtotal,
      gstTotal,
      grandTotal,
      paymentTerms: profile.paymentTerms,
      dueDate,
      status: "UNPAID",
    })

    // Update order with invoice reference
    order.invoice = invoice._id
    await order.save()

    // Update credit used
    user.distributorProfile.creditUsed += grandTotal
    await user.save()

    res.status(201).json({ order, invoice })
  } catch (err) {
    console.error("createB2BOrder error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/distributor/orders
export const getDistributorOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean()

    res.json(orders || [])
  } catch (err) {
    console.error("getDistributorOrders error:", err)
    res.status(500).json({ message: err.message || "Server error" })
  }
}

// GET /api/distributor/invoices
export const getDistributorInvoices = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const invoices = await Invoice.find({ distributor: userId })
      .populate("order", "orderId status total")
      .sort({ createdAt: -1 })
      .lean()

    res.json(invoices || [])
  } catch (err) {
    console.error("getDistributorInvoices error:", err)
    res.status(500).json({ message: err.message || "Server error" })
  }
}

// GET /api/distributor/assigned-orders — customer orders routed to this distributor
export const getAssignedOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    if (req.user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const { status } = req.query
    const filter = { distributor: userId, orderType: { $ne: "B2B" } }
    if (status) filter.status = status

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    res.json(orders || [])
  } catch (err) {
    console.error("getAssignedOrders error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/distributor/assigned-orders/:orderId/status — update order status
export const updateAssignedOrderStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const { orderId } = req.params
    const { status } = req.body

    const validStatuses = ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` })
    }

    const order = await Order.findOne({ orderId, distributor: userId })
    if (!order) {
      return res.status(404).json({ message: "Order not found or not assigned to you" })
    }

    order.status = status
    if (status === "CONFIRMED") order.timeline.assignedShopAt = new Date()
    if (status === "DELIVERED") order.timeline.deliveredAt = new Date()
    if (status === "CANCELLED") {
      order.timeline.cancelledAt = new Date()
      order.cancelledReason = "Cancelled by distributor"
    }

    await order.save()
    res.json({ message: "Order status updated", order })
  } catch (err) {
    console.error("updateAssignedOrderStatus error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/distributor/credit-summary
export const getCreditSummary = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const profile = user.distributorProfile || {}
    const creditLimit = profile.creditLimit || 0
    const creditUsed = profile.creditUsed || 0

    // Fetch order and invoice stats
    const [totalOrders, unpaidInvoices] = await Promise.all([
      Order.countDocuments({ user: user._id, orderType: "B2B" }),
      Invoice.find({ distributor: user._id, status: { $in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } })
        .select("grandTotal paidAmount")
        .lean(),
    ])

    const pendingInvoices = unpaidInvoices.length
    const outstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + ((inv.grandTotal || 0) - (inv.paidAmount || 0)),
      0
    )

    res.json({
      creditLimit,
      creditUsed,
      creditAvailable: creditLimit - creditUsed,
      paymentTerms: profile.paymentTerms || "COD",
      totalOrders,
      pendingInvoices,
      outstanding,
    })
  } catch (err) {
    console.error("getCreditSummary error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/distributor/dashboard — combined dashboard data for web & app
export const getDashboard = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const profile = user.distributorProfile || {}
    const creditLimit = profile.creditLimit || 0
    const creditUsed = profile.creditUsed || 0

    // Fetch order, invoice and product stats
    const [totalOrders, unpaidInvoices, products] = await Promise.all([
      Order.countDocuments({ user: user._id }),
      Invoice.find({ distributor: user._id, status: { $in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] } })
        .select("grandTotal paidAmount")
        .lean(),
      Product.find({ inStock: true })
        .select("name category image unit variants")
        .lean(),
    ])

    const pendingInvoices = unpaidInvoices.length
    const outstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + ((inv.grandTotal || 0) - (inv.paidAmount || 0)),
      0
    )

    // Stock summary from products
    const stockItems = products.map((p) => {
      const variant = (p.variants || [])[0]
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        image: p.image,
        unit: p.unit || "",
        stock: variant?.stock ?? 0,
        b2bPrice: variant?.b2bPrice ?? 0,
      }
    })

    const inStock = stockItems.filter((p) => p.stock > 10).length
    const lowStock = stockItems.filter((p) => p.stock > 0 && p.stock <= 10).length
    const outOfStock = stockItems.filter((p) => p.stock <= 0).length
    const totalStockValue = stockItems.reduce((sum, p) => sum + p.stock * p.b2bPrice, 0)

    res.json({
      // Credit
      creditLimit,
      creditUsed,
      creditAvailable: creditLimit - creditUsed,
      availableCredit: creditLimit - creditUsed,
      paymentTerms: profile.paymentTerms || "COD",

      // Business
      businessName: profile.businessName || user.name || "Distributor",
      territory: profile.territory || "",
      gstin: profile.gstin || "",
      phone: user.phone,

      // Orders & Invoices
      totalOrders,
      pendingInvoices,
      outstanding,
      outstandingAmount: outstanding,

      // Stock
      totalProducts: stockItems.length,
      inStock,
      lowStock,
      outOfStock,
      totalStockValue,
      stockItems,
    })
  } catch (err) {
    console.error("getDashboard error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/distributor/credit-payment — record a credit payment (after Razorpay verification)
export const recordCreditPayment = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "distributor") {
      return res.status(403).json({ message: "Not a distributor account" })
    }

    const { amount, razorpay_payment_id } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" })
    }

    const profile = user.distributorProfile
    if (!profile) {
      return res.status(400).json({ message: "Distributor profile not found" })
    }

    // Reduce credit used by payment amount
    const prevUsed = profile.creditUsed || 0
    profile.creditUsed = Math.max(0, prevUsed - amount)
    await user.save()

    // Mark unpaid invoices as paid (oldest first)
    let remaining = amount
    const unpaidInvoices = await Invoice.find({
      distributor: user._id,
      status: { $in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
    }).sort({ createdAt: 1 })

    for (const inv of unpaidInvoices) {
      if (remaining <= 0) break
      const due = (inv.grandTotal || 0) - (inv.paidAmount || 0)
      if (due <= 0) continue

      const payment = Math.min(remaining, due)
      inv.paidAmount = (inv.paidAmount || 0) + payment
      remaining -= payment

      if (inv.paidAmount >= inv.grandTotal) {
        inv.status = "PAID"
        inv.paidAt = new Date()
      } else {
        inv.status = "PARTIALLY_PAID"
      }
      await inv.save()
    }

    res.json({
      message: "Credit payment recorded",
      creditUsed: profile.creditUsed,
      creditAvailable: (profile.creditLimit || 0) - profile.creditUsed,
      razorpay_payment_id,
    })
  } catch (err) {
    console.error("recordCreditPayment error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// ---- Admin endpoints ----

// GET /api/admin/distributors
export const listDistributors = async (req, res) => {
  try {
    const { approved } = req.query
    const filter = { role: "distributor" }

    if (approved === "true") {
      filter["distributorProfile.isApproved"] = true
    } else if (approved === "false") {
      filter["distributorProfile.isApproved"] = false
    }

    const distributors = await User.find(filter)
      .select("-passwordHash -otpCode -otpExpiresAt")
      .sort({ createdAt: -1 })
      .lean()

    res.json(distributors)
  } catch (err) {
    console.error("listDistributors error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/distributors/:id/approve
export const approveDistributor = async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user.id

    const user = await User.findById(id)
    if (!user || user.role !== "distributor") {
      return res.status(404).json({ message: "Distributor not found" })
    }

    if (user.distributorProfile.isApproved) {
      return res.status(400).json({ message: "Distributor already approved" })
    }

    user.distributorProfile.isApproved = true
    user.distributorProfile.approvedAt = new Date()
    user.distributorProfile.approvedBy = adminId
    await user.save()

    res.json({ message: "Distributor approved", user })
  } catch (err) {
    console.error("approveDistributor error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/distributors/:id/credit
export const updateDistributorCredit = async (req, res) => {
  try {
    const { id } = req.params
    const { creditLimit, paymentTerms } = req.body

    const user = await User.findById(id)
    if (!user || user.role !== "distributor") {
      return res.status(404).json({ message: "Distributor not found" })
    }

    if (creditLimit !== undefined) {
      user.distributorProfile.creditLimit = creditLimit
    }
    if (paymentTerms !== undefined) {
      user.distributorProfile.paymentTerms = paymentTerms
    }

    await user.save()
    res.json({
      message: "Credit settings updated",
      distributorProfile: user.distributorProfile,
    })
  } catch (err) {
    console.error("updateDistributorCredit error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
