import { Zone } from "../models/Zone.js"

// POST /api/admin/zones
export const createZone = async (req, res) => {
  try {
    const {
      name,
      code,
      city,
      pincodes,
      deliveryFee,
      freeDeliveryAbove,
    } = req.body

    if (!name) {
      return res.status(400).json({ message: "Zone name is required" })
    }
    if (!code) {
      return res.status(400).json({ message: "Zone code is required" })
    }

    const existing = await Zone.findOne({ code: code.toUpperCase() })
    if (existing) {
      return res.status(409).json({ message: "Zone code already exists" })
    }

    const zone = await Zone.create({
      name,
      code: code.toUpperCase(),
      city: city || "Bangalore",
      pincodes: pincodes || [],
      deliveryFee: deliveryFee !== undefined ? deliveryFee : 20,
      freeDeliveryAbove: freeDeliveryAbove !== undefined ? freeDeliveryAbove : 199,
      isActive: true,
    })

    res.status(201).json(zone)
  } catch (err) {
    console.error("createZone error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/zones
export const listZones = async (req, res) => {
  try {
    const { active } = req.query
    const filter = {}

    if (active === "true") filter.isActive = true
    if (active === "false") filter.isActive = false

    const zones = await Zone.find(filter).sort({ name: 1 }).lean()
    res.json(zones)
  } catch (err) {
    console.error("listZones error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/zones/:id
export const updateZone = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const zone = await Zone.findById(id)
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" })
    }

    const allowedFields = [
      "name",
      "city",
      "pincodes",
      "deliveryFee",
      "freeDeliveryAbove",
      "isActive",
      "assignedDeliveryBoys",
    ]

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        zone[field] = updates[field]
      }
    }

    await zone.save()
    res.json(zone)
  } catch (err) {
    console.error("updateZone error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// DELETE /api/admin/zones/:id - Soft delete
export const deleteZone = async (req, res) => {
  try {
    const { id } = req.params

    const zone = await Zone.findById(id)
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" })
    }

    zone.isActive = false
    await zone.save()

    res.json({ message: "Zone deactivated", zone })
  } catch (err) {
    console.error("deleteZone error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
