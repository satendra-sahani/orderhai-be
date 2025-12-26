// File: routes/adminRoutes.js
import { Router } from "express";
import { adminRequired } from "../middleware/auth.js";

import {
  clearSponsor,
  createProduct,
  listProducts,
  setSponsor,
  updateProduct,
} from "../controllers/productController.js";
import {
  assignProductsToShop,
  createShop,
  listShops,
  updateShop,
} from "../controllers/shopController.js";
// import { getNearestShopsForOrder } from "../controllers/adminController.js";
import {
  listAdminOrders,
  assignShopToOrder,
  assignDeliveryBoyToOrder,
  markShopPaid,
  updateOrderStatusAdmin,
  getNearestShopsForOrder,
} from "../controllers/adminController.js";

const router = Router();

router.use(adminRequired);

// product admin
router.post("/products", createProduct);
router.get("/products", listProducts);
router.patch("/products/:id", updateProduct);
router.put("/products/:productId/sponsor", setSponsor);
router.delete("/products/:productId/sponsor", clearSponsor);

// shop admin
router.post("/shops", createShop);
router.get("/shops", listShops);
router.patch("/shops/:id", updateShop);
router.post("/shops/:shopId/products", assignProductsToShop);

// order admin
router.get("/orders", listAdminOrders);
router.get("/orders/:orderId/nearest-shops", getNearestShopsForOrder);
router.patch("/orders/:orderId/assign-shop", assignShopToOrder);
router.patch("/orders/:orderId/assign-delivery", assignDeliveryBoyToOrder);
router.patch("/orders/:orderId/mark-shop-paid", markShopPaid);
router.patch("/orders/:orderId/status", updateOrderStatusAdmin);

export default router;
