import { Router } from "express"
import { deliveryBoyRequired } from "../middleware/auth.js"
import {
  getTodayAssignments,
  startAssignment,
  updateDeliveryStatus,
  confirmDelivery,
  updateLocation,
  getEarnings,
  getEarningsHistory,
  getSettlements,
  requestLeave,
  getLeaveRequests,
  toggleAvailability,
} from "../controllers/deliveryController.js"

const router = Router()
router.use(deliveryBoyRequired)

router.get("/assignments/today", getTodayAssignments)
router.patch("/assignments/:id/start", startAssignment)
router.patch("/orders/:id/status", updateDeliveryStatus)
router.post("/orders/:id/confirm", confirmDelivery)
router.patch("/location", updateLocation)
router.get("/earnings", getEarnings)
router.get("/earnings/history", getEarningsHistory)
router.get("/settlements", getSettlements)
router.post("/leave", requestLeave)
router.get("/leave", getLeaveRequests)
router.patch("/availability", toggleAvailability)

export default router
