import { Router } from "express"
import { authRequired } from "../middleware/auth.js"
import {
    clearSponsor,
  createProduct,
  getProductDetails,
  listProducts,
  setSponsor,
  updateProduct,
} from "../controllers/productController.js"

const router = Router()

// router.use(authRequired)

// router.post("/", createProduct)
router.get("/", listProducts)
router.get("/:productId", getProductDetails )
// router.patch("/:id", updateProduct)
// router.put("/:productId/sponsor", setSponsor)
// router.delete("/:productId/sponsor", clearSponsor)
export default router
