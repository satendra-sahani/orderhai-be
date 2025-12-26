import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config/env.js"
import { User } from "../models/User.js"

export const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: "No token" })

    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: "User not found" })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" })
  }
}
// ✅ Auth + Admin check (for admin routes)
export const adminRequired = async (req, res, next) => {
  await authRequired(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" })
    }
    next()
  })
}
