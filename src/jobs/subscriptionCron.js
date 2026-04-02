import { Subscription } from "../models/Subscription.js"
import { Order } from "../models/Order.js"
import mongoose from "mongoose"

const orderCounterSchema = new mongoose.Schema(
  { _id: { type: String, default: "order" }, seq: { type: Number, default: 1000 } },
  { collection: "order_counters" },
)
const OrderCounter = mongoose.models.OrderCounter || mongoose.model("OrderCounter", orderCounterSchema)

const generateOrderCode = async () => {
  const counter = await OrderCounter.findOneAndUpdate(
    { _id: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean()
  return `ORDER${counter.seq}`
}

const getNextDeliveryDate = (current, frequency, customDays) => {
  const next = new Date(current)
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1)
      break
    case "ALT_DAYS":
      next.setDate(next.getDate() + 2)
      break
    case "WEEKLY":
      next.setDate(next.getDate() + 7)
      break
    case "CUSTOM":
      if (customDays && customDays.length > 0) {
        const currentDay = next.getDay()
        const sorted = [...customDays].sort((a, b) => a - b)
        const nextDay = sorted.find((d) => d > currentDay)
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay))
        } else {
          next.setDate(next.getDate() + (7 - currentDay + sorted[0]))
        }
      } else {
        next.setDate(next.getDate() + 1)
      }
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  return next
}

/**
 * Generate subscription orders for today.
 * Called daily by Vercel Cron or manual trigger.
 */
export const generateSubscriptionOrders = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const subscriptions = await Subscription.find({
    status: "ACTIVE",
    nextDeliveryDate: { $gte: today, $lt: tomorrow },
  }).populate("items.product")

  const results = { created: 0, errors: 0 }

  for (const sub of subscriptions) {
    try {
      const items = sub.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        price: item.product.sellingPrice,
        qty: item.qty,
        variantName: item.variant || undefined,
      }))

      const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0)
      const deliveryFee = subtotal >= 199 ? 0 : 20
      const total = subtotal + deliveryFee

      const orderId = await generateOrderCode()

      await Order.create({
        user: sub.user,
        phone: "",
        name: "",
        address: sub.address
          ? `${sub.address.line1 || ""}, ${sub.address.city || ""}`.trim()
          : "",
        lat: sub.address?.latitude,
        lng: sub.address?.longitude,
        items,
        subtotal,
        deliveryFee,
        total,
        orderId,
        orderType: "SUBSCRIPTION",
        deliverySlot: sub.deliverySlot,
        deliveryDate: today,
        subscription: sub._id,
        paymentMethod: sub.paymentMethod === "WALLET" ? "ONLINE" : sub.paymentMethod || "COD",
        status: "PENDING",
        timeline: { createdAt: new Date() },
      })

      sub.totalDelivered += 1
      sub.nextDeliveryDate = getNextDeliveryDate(today, sub.frequency, sub.customDays)

      if (sub.endDate && sub.nextDeliveryDate > sub.endDate) {
        sub.status = "CANCELLED"
      }

      await sub.save()
      results.created++
    } catch (err) {
      console.error(`Subscription ${sub._id} order generation failed:`, err)
      results.errors++
    }
  }

  return results
}
