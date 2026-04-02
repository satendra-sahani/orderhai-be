import { User } from "../models/User.js"
import { Order } from "../models/Order.js"
import { DeliveryAssignment } from "../models/DeliveryAssignment.js"
import { Settlement } from "../models/Settlement.js"
import { LeaveRequest } from "../models/LeaveRequest.js"

// GET /api/delivery/assignments/today
export const getTodayAssignments = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id

    // Get start and end of today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const assignments = await DeliveryAssignment.find({
      deliveryBoy: deliveryBoyId,
      date: { $gte: todayStart, $lte: todayEnd },
    })
      .populate(
        "orders",
        "orderId name phone address lat lng items total status deliverySlot deliveryOtp timeline"
      )
      .sort({ slot: 1 })
      .lean()

    res.json(assignments)
  } catch (err) {
    console.error("getTodayAssignments error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/delivery/assignments/:id/start
export const startAssignment = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { id } = req.params

    const assignment = await DeliveryAssignment.findOne({
      _id: id,
      deliveryBoy: deliveryBoyId,
    })
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" })
    }
    if (assignment.status !== "ASSIGNED") {
      return res
        .status(400)
        .json({ message: "Assignment is already started or completed" })
    }

    assignment.status = "IN_PROGRESS"
    assignment.startedAt = new Date()
    await assignment.save()

    res.json(assignment)
  } catch (err) {
    console.error("startAssignment error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/delivery/orders/:id/status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      })
    }

    const order = await Order.findOne({
      _id: id,
      deliveryBoy: deliveryBoyId,
    })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.status = status

    // Update timeline
    if (!order.timeline) {
      order.timeline = { createdAt: order.createdAt || new Date() }
    }
    if (status === "OUT_FOR_DELIVERY") {
      order.timeline.pickedUpAt = new Date()
    }
    if (status === "DELIVERED") {
      order.timeline.deliveredAt = new Date()
    }

    await order.save()
    res.json(order)
  } catch (err) {
    console.error("updateDeliveryStatus error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/delivery/orders/:id/confirm
export const confirmDelivery = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { id } = req.params
    const { otp } = req.body

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" })
    }

    const order = await Order.findOne({
      _id: id,
      deliveryBoy: deliveryBoyId,
    })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Verify OTP
    if (order.deliveryOtp !== otp && order.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    order.status = "DELIVERED"
    if (!order.timeline) {
      order.timeline = { createdAt: order.createdAt || new Date() }
    }
    order.timeline.deliveredAt = new Date()

    await order.save()

    // Update assignment totals if exists
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    await DeliveryAssignment.updateOne(
      {
        deliveryBoy: deliveryBoyId,
        date: { $gte: todayStart, $lte: todayEnd },
        orders: order._id,
      },
      { $inc: { totalEarnings: 15 } } // ₹15 per delivery
    )

    // Update delivery boy earnings
    await User.updateOne(
      { _id: deliveryBoyId },
      {
        $inc: {
          "deliveryProfile.totalEarnings": 15,
          "deliveryProfile.pendingSettlement": 15,
        },
      }
    )

    res.json({ message: "Delivery confirmed", order })
  } catch (err) {
    console.error("confirmDelivery error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/delivery/location
export const updateLocation = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { lat, lng } = req.body

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "lat and lng are required" })
    }

    await User.updateOne(
      { _id: deliveryBoyId },
      {
        $set: {
          "deliveryProfile.currentLocation.lat": lat,
          "deliveryProfile.currentLocation.lng": lng,
        },
      }
    )

    res.json({ message: "Location updated" })
  } catch (err) {
    console.error("updateLocation error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/delivery/earnings
export const getEarnings = async (req, res) => {
  try {
    const user = req.user
    const profile = user.deliveryProfile || {}

    res.json({
      totalEarnings: profile.totalEarnings || 0,
      pendingSettlement: profile.pendingSettlement || 0,
    })
  } catch (err) {
    console.error("getEarnings error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/delivery/earnings/history
export const getEarningsHistory = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { page = 1, limit = 20 } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const assignments = await DeliveryAssignment.find({
      deliveryBoy: deliveryBoyId,
      status: "COMPLETED",
    })
      .select("date slot zone totalEarnings completedAt orders")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const total = await DeliveryAssignment.countDocuments({
      deliveryBoy: deliveryBoyId,
      status: "COMPLETED",
    })

    res.json({
      assignments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (err) {
    console.error("getEarningsHistory error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/delivery/settlements
export const getSettlements = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const settlements = await Settlement.find({ deliveryBoy: deliveryBoyId })
      .sort({ createdAt: -1 })
      .lean()

    res.json(settlements)
  } catch (err) {
    console.error("getSettlements error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/delivery/leave
export const requestLeave = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { date, reason } = req.body

    if (!date) {
      return res.status(400).json({ message: "Date is required" })
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason is required" })
    }

    // Check for duplicate leave on same date
    const leaveDate = new Date(date)
    leaveDate.setHours(0, 0, 0, 0)
    const leaveEnd = new Date(leaveDate)
    leaveEnd.setHours(23, 59, 59, 999)

    const existing = await LeaveRequest.findOne({
      deliveryBoy: deliveryBoyId,
      date: { $gte: leaveDate, $lte: leaveEnd },
      status: { $ne: "REJECTED" },
    })
    if (existing) {
      return res
        .status(400)
        .json({ message: "Leave request already exists for this date" })
    }

    const leave = await LeaveRequest.create({
      deliveryBoy: deliveryBoyId,
      date: leaveDate,
      reason,
    })

    res.status(201).json(leave)
  } catch (err) {
    console.error("requestLeave error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/delivery/leave
export const getLeaveRequests = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const leaves = await LeaveRequest.find({ deliveryBoy: deliveryBoyId })
      .sort({ date: -1 })
      .lean()

    res.json(leaves)
  } catch (err) {
    console.error("getLeaveRequests error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/delivery/availability
export const toggleAvailability = async (req, res) => {
  try {
    const deliveryBoyId = req.user.id
    const { isAvailable } = req.body

    if (isAvailable === undefined) {
      return res.status(400).json({ message: "isAvailable is required" })
    }

    await User.updateOne(
      { _id: deliveryBoyId },
      { $set: { "deliveryProfile.isAvailable": Boolean(isAvailable) } }
    )

    res.json({ message: "Availability updated", isAvailable: Boolean(isAvailable) })
  } catch (err) {
    console.error("toggleAvailability error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// ---- Admin delivery management ----

// GET /api/admin/delivery-boys
export const listDeliveryBoys = async (req, res) => {
  try {
    const { zone, available } = req.query
    const filter = { role: "delivery_boy" }

    if (zone) {
      filter["deliveryProfile.assignedZone"] = zone
    }
    if (available === "true") {
      filter["deliveryProfile.isAvailable"] = true
    }
    if (available === "false") {
      filter["deliveryProfile.isAvailable"] = false
    }

    const deliveryBoys = await User.find(filter)
      .select("-passwordHash -otpCode -otpExpiresAt")
      .sort({ name: 1 })
      .lean()

    res.json(deliveryBoys)
  } catch (err) {
    console.error("listDeliveryBoys error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/admin/delivery-boys
export const createDeliveryBoy = async (req, res) => {
  try {
    const {
      phone,
      name,
      vehicleType,
      vehicleNumber,
      assignedZone,
      bankAccount,
    } = req.body

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" })
    }
    if (!name) {
      return res.status(400).json({ message: "Name is required" })
    }

    const existing = await User.findOne({ phone })
    if (existing) {
      return res
        .status(409)
        .json({ message: "Phone number already registered" })
    }

    const user = await User.create({
      phone,
      name,
      role: "delivery_boy",
      deliveryProfile: {
        vehicleType: vehicleType || "",
        vehicleNumber: vehicleNumber || "",
        assignedZone: assignedZone || "",
        isAvailable: true,
        bankAccount: bankAccount || {},
        totalEarnings: 0,
        pendingSettlement: 0,
      },
    })

    res.status(201).json({
      message: "Delivery boy created",
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        deliveryProfile: user.deliveryProfile,
      },
    })
  } catch (err) {
    console.error("createDeliveryBoy error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/admin/delivery-assignments
export const assignOrdersToDeliveryBoy = async (req, res) => {
  try {
    const { deliveryBoyId, orderIds, slot, zone, date } = req.body

    if (!deliveryBoyId) {
      return res.status(400).json({ message: "deliveryBoyId is required" })
    }
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "orderIds are required" })
    }
    if (!slot) {
      return res.status(400).json({ message: "slot is required" })
    }

    // Verify delivery boy exists
    const deliveryBoy = await User.findById(deliveryBoyId)
    if (!deliveryBoy || deliveryBoy.role !== "delivery_boy") {
      return res.status(404).json({ message: "Delivery boy not found" })
    }

    const assignmentDate = date ? new Date(date) : new Date()
    assignmentDate.setHours(0, 0, 0, 0)

    // Create assignment
    const assignment = await DeliveryAssignment.create({
      deliveryBoy: deliveryBoyId,
      date: assignmentDate,
      slot,
      zone: zone || deliveryBoy.deliveryProfile?.assignedZone || "",
      orders: orderIds,
    })

    // Update each order with delivery boy
    await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          deliveryBoy: deliveryBoyId,
          status: "CONFIRMED",
          "timeline.assignedDeliveryAt": new Date(),
        },
      }
    )

    // Generate OTPs for orders that don't have them
    const orders = await Order.find({
      _id: { $in: orderIds },
      deliveryOtp: { $exists: false },
    })
    for (const order of orders) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()
      await order.save()
    }

    res.status(201).json(assignment)
  } catch (err) {
    console.error("assignOrdersToDeliveryBoy error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/admin/settlements
export const processSettlements = async (req, res) => {
  try {
    const { deliveryBoyId, from, to } = req.body

    if (!deliveryBoyId || !from || !to) {
      return res
        .status(400)
        .json({ message: "deliveryBoyId, from, and to are required" })
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)

    // Find completed assignments in period
    const assignments = await DeliveryAssignment.find({
      deliveryBoy: deliveryBoyId,
      status: "COMPLETED",
      date: { $gte: fromDate, $lte: toDate },
    }).lean()

    const totalDeliveries = assignments.reduce(
      (sum, a) => sum + (a.orders ? a.orders.length : 0),
      0
    )
    const totalEarnings = assignments.reduce(
      (sum, a) => sum + (a.totalEarnings || 0),
      0
    )

    const settlement = await Settlement.create({
      deliveryBoy: deliveryBoyId,
      period: { from: fromDate, to: toDate },
      totalDeliveries,
      totalEarnings,
      deductions: 0,
      netAmount: totalEarnings,
      status: "PENDING",
    })

    // Reset pending settlement on user
    await User.updateOne(
      { _id: deliveryBoyId },
      { $set: { "deliveryProfile.pendingSettlement": 0 } }
    )

    res.status(201).json(settlement)
  } catch (err) {
    console.error("processSettlements error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/leave-requests/:id
export const handleLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const adminId = req.user.id

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ message: "status must be APPROVED or REJECTED" })
    }

    const leave = await LeaveRequest.findById(id)
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" })
    }
    if (leave.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Leave request has already been processed" })
    }

    leave.status = status
    leave.approvedBy = adminId
    await leave.save()

    res.json({ message: `Leave request ${status.toLowerCase()}`, leave })
  } catch (err) {
    console.error("handleLeaveRequest error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
