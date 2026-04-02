import { Router } from "express"
import { authRequired } from "../middleware/auth.js"
import {
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/userController.js"
import { addToCart, cancelOrder, clearCart, createOrder, getCart, getMyOrders, removeFromCart, updateCartItem } from "../controllers/orderController.js"
import {
  createSubscription,
  getMySubscriptions,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "../controllers/subscriptionController.js"
import { validateCoupon } from "../controllers/couponController.js"
import { getWallet, getReferralCode, applyReferral } from "../controllers/walletController.js"
import { createComplaint, getMyComplaints } from "../controllers/complaintController.js"

const router = Router()

router.use(authRequired)

router.get("/me", getMe)
router.put("/me", updateProfile)

router.post("/addresses", addAddress)
router.put("/addresses/:addressId", updateAddress)
router.delete("/addresses/:addressId", deleteAddress)

// Cart
router.get("/cart",  getCart);
router.post("/cart",  addToCart);
router.patch("/cart/:productId",  updateCartItem);
router.delete("/cart/:productId",  removeFromCart);
router.delete("/cart",  clearCart);

// Orders
router.post("/orders",  createOrder);
router.get("/orders",  getMyOrders);
router.post("/orders/:id/cancel",  cancelOrder);

// Favorites
router.get("/favorites",  listFavorites);
router.post("/favorites/:productId",  addFavorite);
router.delete("/favorites/:productId",  removeFavorite);

// Subscriptions
router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getMySubscriptions);
router.patch("/subscriptions/:id", updateSubscription);
router.post("/subscriptions/:id/pause", pauseSubscription);
router.post("/subscriptions/:id/resume", resumeSubscription);
router.delete("/subscriptions/:id", cancelSubscription);

// Coupons
router.post("/coupons/validate", validateCoupon);

// Wallet
router.get("/wallet", getWallet);

// Referral
router.get("/referral-code", getReferralCode);
router.post("/referral", applyReferral);

// Complaints
router.post("/complaints", createComplaint);
router.get("/complaints", getMyComplaints);

export default router
