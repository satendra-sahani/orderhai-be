import { Router } from "express"
import { distributorRequired } from "../middleware/auth.js"
import {
  getDistributorProfile,
  updateDistributorProfile,
  getB2BProducts,
  createB2BOrder,
  getDistributorOrders,
  getDistributorInvoices,
  getCreditSummary,
  getDashboard,
  getAssignedOrders,
  updateAssignedOrderStatus,
  recordCreditPayment,
} from "../controllers/distributorController.js"

const router = Router()
router.use(distributorRequired)

router.get("/dashboard", getDashboard)
router.get("/profile", getDistributorProfile)
router.put("/profile", updateDistributorProfile)
router.get("/products", getB2BProducts)
router.post("/orders", createB2BOrder)
router.get("/orders", getDistributorOrders)
router.get("/invoices", getDistributorInvoices)
router.get("/credit-summary", getCreditSummary)
router.post("/credit-payment", recordCreditPayment)
router.get("/assigned-orders", getAssignedOrders)
router.patch("/assigned-orders/:orderId/status", updateAssignedOrderStatus)

export default router
