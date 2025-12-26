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



export default router
