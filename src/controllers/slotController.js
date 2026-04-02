import { DeliverySlot } from "../models/DeliverySlot.js"
import { Order } from "../models/Order.js"

// POST /api/admin/slots
export const createSlot = async (req, res) => {
  try {
    const { name, code, startTime, endTime, cutoffTime, maxOrders, zones } =
      req.body

    if (!name || !code || !startTime || !endTime || !cutoffTime) {
      return res.status(400).json({
        message: "name, code, startTime, endTime, and cutoffTime are required",
      })
    }

    const existing = await DeliverySlot.findOne({ code: code.toUpperCase() })
    if (existing) {
      return res.status(409).json({ message: "Slot code already exists" })
    }

    const slot = await DeliverySlot.create({
      name,
      code: code.toUpperCase(),
      startTime,
      endTime,
      cutoffTime,
      maxOrders: maxOrders || 50,
      isActive: true,
      zones: zones || [],
    })

    res.status(201).json(slot)
  } catch (err) {
    console.error("createSlot error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/admin/slots
export const listSlots = async (req, res) => {
  try {
    const { active } = req.query
    const filter = {}

    if (active === "true") filter.isActive = true
    if (active === "false") filter.isActive = false

    const slots = await DeliverySlot.find(filter).sort({ startTime: 1 }).lean()
    res.json(slots)
  } catch (err) {
    console.error("listSlots error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/slots/:id
export const updateSlot = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const slot = await DeliverySlot.findById(id)
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" })
    }

    const allowedFields = [
      "name",
      "startTime",
      "endTime",
      "cutoffTime",
      "maxOrders",
      "isActive",
      "zones",
    ]

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        slot[field] = updates[field]
      }
    }

    await slot.save()
    res.json(slot)
  } catch (err) {
    console.error("updateSlot error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/slots/available?zone=ZONE_CODE
export const getAvailableSlots = async (req, res) => {
  try {
    const { zone } = req.query

    const filter = { isActive: true }
    if (zone) {
      filter.zones = zone
    }

    const slots = await DeliverySlot.find(filter).sort({ startTime: 1 }).lean()

    // Get current time in HH:MM format
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    // Get today's date range for order count
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const availableSlots = []

    for (const slot of slots) {
      // Skip slots whose cutoff time has passed
      if (slot.cutoffTime <= currentTime) {
        continue
      }

      // Count existing orders for this slot today
      const orderCount = await Order.countDocuments({
        deliverySlot: slot.code,
        deliveryDate: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ["CANCELLED", "RETURNED"] },
      })

      // Check capacity
      if (orderCount < slot.maxOrders) {
        availableSlots.push({
          _id: slot._id,
          name: slot.name,
          code: slot.code,
          startTime: slot.startTime,
          endTime: slot.endTime,
          cutoffTime: slot.cutoffTime,
          remainingCapacity: slot.maxOrders - orderCount,
        })
      }
    }

    res.json(availableSlots)
  } catch (err) {
    console.error("getAvailableSlots error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
