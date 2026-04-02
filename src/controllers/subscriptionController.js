import { Subscription } from "../models/Subscription.js"
import { Order } from "../models/Order.js"
import { Product } from "../models/Product.js"

// Helper: calculate next delivery date based on frequency and a reference date
const calcNextDeliveryDate = (fromDate, frequency, customDays) => {
  const d = new Date(fromDate)

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1)
      return d

    case "ALT_DAYS":
      d.setDate(d.getDate() + 2)
      return d

    case "WEEKLY":
      d.setDate(d.getDate() + 7)
      return d

    case "CUSTOM": {
      if (!customDays || customDays.length === 0) return null
      const sorted = [...customDays].sort((a, b) => a - b)
      const currentDay = d.getDay()
      // Find the next custom day after current day
      const nextDay = sorted.find((day) => day > currentDay)
      if (nextDay !== undefined) {
        d.setDate(d.getDate() + (nextDay - currentDay))
      } else {
        // Wrap to next week's first custom day
        d.setDate(d.getDate() + (7 - currentDay + sorted[0]))
      }
      return d
    }

    default:
      return null
  }
}

// POST /api/users/subscriptions
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const {
      items,
      frequency,
      customDays,
      deliverySlot,
      address,
      startDate,
      endDate,
      paymentMethod,
    } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" })
    }
    if (!startDate) {
      return res.status(400).json({ message: "startDate is required" })
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required" })
    }

    // Validate all products exist
    const productIds = items.map((it) => it.product)
    const products = await Product.find({ _id: { $in: productIds } }).lean()
    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "One or more products not found" })
    }

    // Check subscribable
    const nonSubscribable = products.filter((p) => !p.isSubscribable)
    if (nonSubscribable.length > 0) {
      return res.status(400).json({
        message: `Products not available for subscription: ${nonSubscribable.map((p) => p.name).join(", ")}`,
      })
    }

    const start = new Date(startDate)
    const nextDeliveryDate = calcNextDeliveryDate(
      start,
      frequency || "DAILY",
      customDays
    )

    const subscription = await Subscription.create({
      user: userId,
      items,
      frequency: frequency || "DAILY",
      customDays: frequency === "CUSTOM" ? customDays : [],
      deliverySlot: deliverySlot || "MORNING",
      address,
      startDate: start,
      endDate: endDate ? new Date(endDate) : undefined,
      paymentMethod: paymentMethod || "COD",
      nextDeliveryDate: nextDeliveryDate || start,
      status: "ACTIVE",
    })

    res.status(201).json(subscription)
  } catch (err) {
    console.error("createSubscription error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/users/subscriptions
export const getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user.id
    const subscriptions = await Subscription.find({ user: userId })
      .populate("items.product", "name image unit sellingPrice")
      .sort({ createdAt: -1 })
      .lean()

    res.json(subscriptions)
  } catch (err) {
    console.error("getMySubscriptions error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/users/subscriptions/:id
export const updateSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const {
      items,
      frequency,
      customDays,
      deliverySlot,
      address,
      endDate,
      paymentMethod,
    } = req.body

    const subscription = await Subscription.findOne({ _id: id, user: userId })
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" })
    }
    if (subscription.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "Cannot update a cancelled subscription" })
    }

    if (items) {
      // Validate products
      const productIds = items.map((it) => it.product)
      const products = await Product.find({ _id: { $in: productIds } }).lean()
      if (products.length !== productIds.length) {
        return res
          .status(400)
          .json({ message: "One or more products not found" })
      }
      subscription.items = items
    }
    if (frequency) {
      subscription.frequency = frequency
      if (frequency === "CUSTOM" && customDays) {
        subscription.customDays = customDays
      }
    }
    if (deliverySlot) subscription.deliverySlot = deliverySlot
    if (address) subscription.address = address
    if (endDate !== undefined)
      subscription.endDate = endDate ? new Date(endDate) : undefined
    if (paymentMethod) subscription.paymentMethod = paymentMethod

    // Recalculate next delivery
    const referenceDate =
      subscription.nextDeliveryDate || subscription.startDate
    subscription.nextDeliveryDate = calcNextDeliveryDate(
      referenceDate,
      subscription.frequency,
      subscription.customDays
    )

    await subscription.save()
    res.json(subscription)
  } catch (err) {
    console.error("updateSubscription error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/users/subscriptions/:id/pause
export const pauseSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { pausedUntil } = req.body

    const subscription = await Subscription.findOne({ _id: id, user: userId })
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" })
    }
    if (subscription.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ message: "Only active subscriptions can be paused" })
    }
    if (!pausedUntil) {
      return res.status(400).json({ message: "pausedUntil date is required" })
    }

    subscription.status = "PAUSED"
    subscription.pausedUntil = new Date(pausedUntil)
    await subscription.save()

    res.json(subscription)
  } catch (err) {
    console.error("pauseSubscription error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/users/subscriptions/:id/resume
export const resumeSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params

    const subscription = await Subscription.findOne({ _id: id, user: userId })
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" })
    }
    if (subscription.status !== "PAUSED") {
      return res
        .status(400)
        .json({ message: "Only paused subscriptions can be resumed" })
    }

    subscription.status = "ACTIVE"
    subscription.pausedUntil = undefined
    // Recalculate next delivery from today
    subscription.nextDeliveryDate = calcNextDeliveryDate(
      new Date(),
      subscription.frequency,
      subscription.customDays
    )
    await subscription.save()

    res.json(subscription)
  } catch (err) {
    console.error("resumeSubscription error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// DELETE /api/users/subscriptions/:id
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params

    const subscription = await Subscription.findOne({ _id: id, user: userId })
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" })
    }
    if (subscription.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "Subscription is already cancelled" })
    }

    subscription.status = "CANCELLED"
    subscription.nextDeliveryDate = undefined
    await subscription.save()

    res.json({ message: "Subscription cancelled", subscription })
  } catch (err) {
    console.error("cancelSubscription error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
