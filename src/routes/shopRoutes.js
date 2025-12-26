import { Router } from "express"
import { authRequired } from "../middleware/auth.js"
import {
  createShop,
  listShops,
  updateShop,
  assignProductsToShop,
} from "../controllers/shopController.js"

const router = Router()

// router.use(authRequired)

// router.post("/", createShop)
// router.get("/", listShops)
// router.patch("/:id", updateShop)
// router.post("/:shopId/products", assignProductsToShop)

export default router
