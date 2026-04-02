import Razorpay from "razorpay"
import crypto from "crypto"

// Initialize Razorpay only if credentials are available
const razorpay = process.env.RAZORPAY_KEY_ID
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null

// POST /api/payments/create-order
export const createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        message: "Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      })
    }

    const { amount, currency, receipt } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" })
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: currency || "INR",
      receipt: receipt || `receipt_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    })
  } catch (err) {
    console.error("createPaymentOrder error:", err)
    res.status(500).json({ message: "Failed to create payment order" })
  }
}

// POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message:
          "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      })
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Payment gateway not configured",
      })
    }

    // Verify signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex")

    const isValid = expectedSignature === razorpay_signature

    if (isValid) {
      res.json({
        success: true,
        message: "Payment verified successfully",
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      })
    }
  } catch (err) {
    console.error("verifyPayment error:", err)
    res.status(500).json({ message: "Payment verification error" })
  }
}
