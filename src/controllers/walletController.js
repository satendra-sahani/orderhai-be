import { User } from "../models/User.js"
import { Referral } from "../models/Referral.js"

// GET /api/users/wallet
export const getWallet = async (req, res) => {
  try {
    const user = req.user
    res.json({
      balance: user.wallet || 0,
    })
  } catch (err) {
    console.error("getWallet error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// GET /api/users/referral-code
export const getReferralCode = async (req, res) => {
  try {
    const user = req.user

    if (!user.referralCode) {
      // Generate referral code: NANDANI + 6 random alphanumeric chars
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let randomPart = ""
      for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      user.referralCode = `NANDANI${randomPart}`
      await user.save()
    }

    res.json({ referralCode: user.referralCode })
  } catch (err) {
    console.error("getReferralCode error:", err)
    res.status(500).json({ message: "Server error" })
  }
}

// POST /api/users/referral
export const applyReferral = async (req, res) => {
  try {
    const user = req.user
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: "Referral code is required" })
    }

    // Check if user has already been referred
    if (user.referredBy) {
      return res
        .status(400)
        .json({ message: "You have already used a referral code" })
    }

    // Cannot refer yourself
    if (user.referralCode === code.toUpperCase()) {
      return res
        .status(400)
        .json({ message: "You cannot use your own referral code" })
    }

    // Find the referrer by referral code
    const referrer = await User.findOne({
      referralCode: code.toUpperCase(),
    })
    if (!referrer) {
      return res.status(404).json({ message: "Invalid referral code" })
    }

    // Check for duplicate referral
    const existingReferral = await Referral.findOne({
      referee: user._id,
    })
    if (existingReferral) {
      return res
        .status(400)
        .json({ message: "Referral already applied to your account" })
    }

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referee: user._id,
      referralCode: code.toUpperCase(),
      reward: 50,
      status: "CREDITED",
      creditedAt: new Date(),
    })

    // Credit wallet to referrer (50 rupees)
    referrer.wallet = (referrer.wallet || 0) + 50
    await referrer.save()

    // Mark user as referred
    user.referredBy = referrer._id
    await user.save()

    res.json({
      message: "Referral applied successfully. Referrer has been credited ₹50.",
      referral,
    })
  } catch (err) {
    console.error("applyReferral error:", err)
    res.status(500).json({ message: "Server error" })
  }
}
