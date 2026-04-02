import { Complaint } from "../models/Complaint.js"

// POST /api/users/complaints
export const createComplaint = async (req, res) => {
  try {
    const userId = req.user.id
    const { order, type, description, images } = req.body

    if (!type) {
      return res.status(400).json({ message: "Complaint type is required" })
    }
    if (!description) {
      return res.status(400).json({ message: "Description is required" })
    }

    const complaint = await Complaint.create({
      user: userId,
      order: order || undefined,
      type,
      description,
      images: images || [],
      status: "OPEN",
    })

    res.status(201).json(complaint)
  } catch (err) {
    console.error("createComplaint error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/users/complaints
export const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.id
    const complaints = await Complaint.find({ user: userId })
      .populate("order", "orderId status total")
      .sort({ createdAt: -1 })
      .lean()

    res.json(complaints)
  } catch (err) {
    console.error("getMyComplaints error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/admin/complaints
export const listAllComplaints = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query
    const filter = {}

    if (status) filter.status = status
    if (type) filter.type = type

    const skip = (Number(page) - 1) * Number(limit)

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("user", "name phone")
        .populate("order", "orderId status total")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Complaint.countDocuments(filter),
    ])

    res.json({
      complaints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (err) {
    console.error("listAllComplaints error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/complaints/:id
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, resolution, assignedTo } = req.body

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" })
    }

    if (status) complaint.status = status
    if (resolution !== undefined) complaint.resolution = resolution
    if (assignedTo !== undefined) complaint.assignedTo = assignedTo || undefined

    if (status === "RESOLVED" || status === "CLOSED") {
      complaint.resolvedAt = new Date()
    }

    await complaint.save()
    res.json(complaint)
  } catch (err) {
    console.error("updateComplaintStatus error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
