import { Router } from "express"
import { authRequired } from "../middleware/auth.js"
import { createPaymentOrder, verifyPayment } from "../controllers/paymentController.js"

const router = Router()

router.post("/create-order", authRequired, createPaymentOrder)
router.post("/verify", authRequired, verifyPayment)

export default router
