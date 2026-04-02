import { Coupon } from "../models/Coupon.js"
import { Order } from "../models/Order.js"

// POST /api/users/coupons/validate
export const validateCoupon = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role || "customer"
    const { code, cartTotal } = req.body

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" })
    }
    if (!cartTotal || cartTotal <= 0) {
      return res.status(400).json({ message: "Valid cartTotal is required" })
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    if (!coupon) {
      return res.json({ valid: false, discount: 0, message: "Coupon not found" })
    }

    // Check active
    if (!coupon.isActive) {
      return res.json({ valid: false, discount: 0, message: "Coupon is no longer active" })
    }

    // Check date validity
    const now = new Date()
    if (now < coupon.validFrom) {
      return res.json({ valid: false, discount: 0, message: "Coupon is not yet valid" })
    }
    if (now > coupon.validUntil) {
      return res.json({ valid: false, discount: 0, message: "Coupon has expired" })
    }

    // Check max uses (0 = unlimited)
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.json({ valid: false, discount: 0, message: "Coupon usage limit reached" })
    }

    // Check per-user limit
    const userUsage = coupon.usedBy.find(
      (u) => u.user.toString() === userId.toString()
    )
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return res.json({
        valid: false,
        discount: 0,
        message: "You have already used this coupon the maximum number of times",
      })
    }

    // Check min order value
    if (cartTotal < coupon.minOrderValue) {
      return res.json({
        valid: false,
        discount: 0,
        message: `Minimum order value is ₹${coupon.minOrderValue}`,
      })
    }

    // Check applicable roles
    if (
      coupon.applicableRoles &&
      coupon.applicableRoles.length > 0 &&
      !coupon.applicableRoles.includes(userRole)
    ) {
      return res.json({
        valid: false,
        discount: 0,
        message: "This coupon is not applicable for your account",
      })
    }

    // FIRST_ORDER type: check if user has any previous orders
    if (coupon.type === "FIRST_ORDER") {
      const orderCount = await Order.countDocuments({ user: userId })
      if (orderCount > 0) {
        return res.json({
          valid: false,
          discount: 0,
          message: "This coupon is only valid for first-time orders",
        })
      }
    }

    // Calculate discount
    let discount = 0
    switch (coupon.type) {
      case "FLAT":
        discount = coupon.value
        break

      case "PERCENT":
        discount = (cartTotal * coupon.value) / 100
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount
        }
        break

      case "FREE_DELIVERY":
        // Assume standard delivery fee of 20
        discount = 20
        break

      case "FIRST_ORDER":
        discount = coupon.value
        break

      case "CASHBACK":
        discount = coupon.value
        break

      default:
        discount = 0
    }

    // Discount shouldn't exceed cart total
    if (discount > cartTotal) {
      discount = cartTotal
    }

    res.json({
      valid: true,
      discount: Math.round(discount * 100) / 100,
      message: "Coupon applied successfully",
      type: coupon.type,
      code: coupon.code,
    })
  } catch (err) {
    console.error("validateCoupon error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/admin/coupons
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      maxDiscount,
      minOrderValue,
      maxUses,
      perUserLimit,
      validFrom,
      validUntil,
      applicableRoles,
      description,
    } = req.body

    if (!code || !type || value === undefined) {
      return res
        .status(400)
        .json({ message: "code, type, and value are required" })
    }
    if (!validFrom || !validUntil) {
      return res
        .status(400)
        .json({ message: "validFrom and validUntil are required" })
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() })
    if (existing) {
      return res
        .status(409)
        .json({ message: "Coupon code already exists" })
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value,
      maxDiscount,
      minOrderValue: minOrderValue || 0,
      maxUses: maxUses || 0,
      perUserLimit: perUserLimit || 1,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      applicableRoles: applicableRoles || ["customer"],
      description,
      isActive: true,
    })

    res.status(201).json(coupon)
  } catch (err) {
    console.error("createCoupon error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/admin/coupons
export const listCoupons = async (req, res) => {
  try {
    const { active } = req.query
    const filter = {}
    if (active === "true") filter.isActive = true
    if (active === "false") filter.isActive = false

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).lean()
    res.json(coupons)
  } catch (err) {
    console.error("listCoupons error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// PATCH /api/admin/coupons/:id
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" })
    }

    const allowedFields = [
      "type",
      "value",
      "maxDiscount",
      "minOrderValue",
      "maxUses",
      "perUserLimit",
      "validFrom",
      "validUntil",
      "applicableRoles",
      "isActive",
      "description",
    ]

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "validFrom" || field === "validUntil") {
          coupon[field] = new Date(updates[field])
        } else {
          coupon[field] = updates[field]
        }
      }
    }

    await coupon.save()
    res.json(coupon)
  } catch (err) {
    console.error("updateCoupon error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// DELETE /api/admin/coupons/:id - Soft delete
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" })
    }

    coupon.isActive = false
    await coupon.save()

    res.json({ message: "Coupon deactivated", coupon })
  } catch (err) {
    console.error("deleteCoupon error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
