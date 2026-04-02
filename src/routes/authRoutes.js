import { Router } from "express"
import { requestOtp, verifyOtp, logout } from "../controllers/authController.js"
import { registerDistributor } from "../controllers/distributorController.js"

const router = Router()

router.post("/login-otp", requestOtp)
router.post("/verify-otp", verifyOtp)
router.post("/logout", logout)
router.post("/register-distributor", registerDistributor)

export default router
