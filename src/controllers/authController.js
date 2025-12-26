import jwt from "jsonwebtoken"
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js"
import { User } from "../models/User.js"

const genOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString() // 6-digit

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || "7d",
  })

// POST /api/auth/login-otp { phone }
export const requestOtp = async (req, res) => {
    const { phone, oldNumber } = req.body
    if (!phone) return res.status(400).json({ message: "Phone required" })

    let user = null

    if (oldNumber) {
        // User is requesting to change their phone number
        user = await User.findOne({ phone: oldNumber })
        console.log("user",user)
        if (!user) {
            return res.status(404).json({ message: "Old phone number not found" })
        }
        // Check if new phone is already taken
        const existing = await User.findOne({ phone })
        if (existing) {
            return res.status(409).json({ message: "New phone number already in use" })
        }
        // Store new phone temporarily for verification
        user.pendingPhone = phone
    } else {
        // Normal login/signup
        user = await User.findOne({ phone })
        if (!user) {
            user = new User({ pendingPhone:phone })
        }else{
            user.pendingPhone = undefined
        }
        // Clear any previous pendingPhone if exists
        
    }

    const otp = genOtp()
    user.otpCode = otp
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await user.save()

    // TODO: integrate SMS provider; for now just return code for dev
    return res.json({ message: "OTP sent", debugOtp: otp })
}

// POST /api/auth/verify-otp { phone, otp }
export const verifyOtp = async (req, res) => {
    const { phone, otp } = req.body
    if (!phone || !otp)
        return res.status(400).json({ message: "Phone and OTP required" })

    // Try to find user by phone or pendingPhone
    let user = await User.findOne({ $or: [{ phone }, { pendingPhone: phone }] })
    if (!user || !user.otpCode) {
        return res.status(400).json({ message: "OTP not requested" })
    }

    if (user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return res.status(400).json({ message: "Invalid or expired OTP" })
    }

    // If pendingPhone matches, update phone field
    if (user.pendingPhone === phone) {
        user.phone = user.pendingPhone
        user.pendingPhone = undefined
    }

    user.otpCode = undefined
    user.otpExpiresAt = undefined
    user.lastLoginAt = new Date()
    user.lastLoginIp = req.ip
    user.lastLoginDevice = req.headers["user-agent"] || ""
    await user.save()

    const token = signToken(user)
    return res.json({
        token,
        user: {
            id: user._id,
            phone: user.phone,
            name: user.name,
        },
    })
}

// POST /api/auth/logout
export const logout = async (_req, res) => {
  // For stateless JWT, just let client drop token.
  return res.json({ message: "Logged out" })
}
