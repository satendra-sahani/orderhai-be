import { Router } from "express"
import { getAvailableSlots } from "../controllers/slotController.js"

const router = Router()
router.get("/available", getAvailableSlots)

export default router
