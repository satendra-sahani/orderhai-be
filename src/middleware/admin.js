import { User } from "../models/User.js"

// ✅ Check if user is admin
export const adminOnly = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ 
      message: "Admin access required" 
    })
  }
  next()
}
