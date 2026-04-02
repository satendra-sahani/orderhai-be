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
import {
  listDistributors,
  approveDistributor,
  updateDistributorCredit,
} from "../controllers/distributorController.js";
import {
  listDeliveryBoys,
  createDeliveryBoy,
  assignOrdersToDeliveryBoy,
  processSettlements,
  handleLeaveRequest,
} from "../controllers/deliveryController.js";
import {
  createZone,
  listZones,
  updateZone,
  deleteZone,
} from "../controllers/zoneController.js";
import {
  createSlot,
  listSlots,
  updateSlot,
} from "../controllers/slotController.js";
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import {
  listAllComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";

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

// distributor admin
router.get("/distributors", listDistributors);
router.get("/distributors/pending", listDistributors);
router.patch("/distributors/:id/approve", approveDistributor);
router.patch("/distributors/:id/credit", updateDistributorCredit);

// delivery boy admin
router.get("/delivery-boys", listDeliveryBoys);
router.post("/delivery-boys", createDeliveryBoy);
router.post("/delivery-boys/assign", assignOrdersToDeliveryBoy);
router.post("/settlements/process", processSettlements);
router.patch("/leave/:id", handleLeaveRequest);

// zone admin
router.post("/zones", createZone);
router.get("/zones", listZones);
router.patch("/zones/:id", updateZone);
router.delete("/zones/:id", deleteZone);

// slot admin
router.post("/slots", createSlot);
router.get("/slots", listSlots);
router.patch("/slots/:id", updateSlot);

// coupon admin
router.post("/coupons", createCoupon);
router.get("/coupons", listCoupons);
router.patch("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

// complaint admin
router.get("/complaints", listAllComplaints);
router.patch("/complaints/:id", updateComplaintStatus);

export default router;
