// File: controllers/adminOrderController.js
import { Order } from "../models/Order.js";
import { Shop } from "../models/Shop.js";

/**
 * GET /api/admin/orders
 * Query:
 *  - status (optional) -> pending|preparing|out_for_delivery|delivered|cancelled (FE style)
 *  - search (optional) -> orderId / name / phone
 */

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  return distanceKm;
}

export const listAdminOrders = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};
    if (status && status !== "all") {
      const map = {
        pending: "PENDING",
        preparing: "CONFIRMED",
        out_for_delivery: "OUT_FOR_DELIVERY",
        delivered: "DELIVERED",
        cancelled: "CANCELLED",
      };
      const dbStatus = map[status];
      if (dbStatus) filter.status = dbStatus;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ orderId: regex }, { name: regex }, { phone: regex }];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("shop", "name address")
      .lean();

    const response = orders.map((o) => {
      const statusMapReverse = {
        PENDING: "pending",
        CONFIRMED: "preparing",
        OUT_FOR_DELIVERY: "out_for_delivery",
        DELIVERED: "delivered",
        CANCELLED: "cancelled",
      };

      const createdAtDate = o.createdAt ? new Date(o.createdAt) : null;

      return {
        id: o.orderId || o._id.toString(),
        customer: o.name || "Guest",
        customerPhone: o.phone,
        customerAddress: o.address,
        items: o.items.map((it) => `${it.name} x${it.qty}`),
        total: o.total,
        status: statusMapReverse[o.status] || "pending",
        shop: o.shop ? o.shop.name : null,
        deliveryBoy: o.deliveryBoy || null,
        time: createdAtDate
          ? createdAtDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        createdAt: createdAtDate ? createdAtDate.toISOString() : null,
        otp: o.otp,
        shopPrice: o.shopPrice || 0,
        shopMargin: o.shopMargin || 0,
        shopPaid: !!o.shopPaid,
        paymentMode: o.paymentMode || "CASH",
        couponCode: o.couponCode,
        offerPrice: o.offerPrice,
        lat: o.lat,
        lng: o.lng,
        timeline: {
          createdAt: o.timeline?.createdAt
            ? new Date(o.timeline.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          assignedShopAt: o.timeline?.assignedShopAt
            ? new Date(o.timeline.assignedShopAt).toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )
            : undefined,
          assignedDeliveryAt: o.timeline?.assignedDeliveryAt
            ? new Date(o.timeline.assignedDeliveryAt).toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )
            : undefined,
          pickedUpAt: o.timeline?.pickedUpAt
            ? new Date(o.timeline.pickedUpAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          deliveredAt: o.timeline?.deliveredAt
            ? new Date(o.timeline.deliveredAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
          cancelledAt: o.timeline?.cancelledAt
            ? new Date(o.timeline.cancelledAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined,
        },
      };
    });

    res.json(response);
  } catch (err) {
    console.error("listAdminOrders", err);
    res.status(500).json({ message: "Failed to load orders" });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/assign-shop
 * body: { shopId, shopPrice, shopMargin }
 */
export const assignShopToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shopId, shopPrice, shopMargin } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.shop = shop._id;
    order.shopPrice = typeof shopPrice === "number" ? shopPrice : order.shopPrice;
    order.shopMargin =
      typeof shopMargin === "number"
        ? shopMargin
        : order.total && shopPrice
        ? order.total - shopPrice
        : order.shopMargin;

    if (order.status === "PENDING") {
      order.status = "CONFIRMED";
    }
    if (!order.timeline) order.timeline = {};
    if (!order.timeline.createdAt) order.timeline.createdAt = order.createdAt || new Date();
    if (!order.timeline.assignedShopAt) order.timeline.assignedShopAt = new Date();

    await order.save();

    res.json({ message: "Shop assigned", orderId: order.orderId });
  } catch (err) {
    console.error("assignShopToOrder", err);
    res.status(500).json({ message: "Failed to assign shop" });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/assign-delivery
 * body: { deliveryBoyName }
 */
export const assignDeliveryBoyToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryBoyName } = req.body;

    if (!deliveryBoyName) {
      return res.status(400).json({ message: "deliveryBoyName required" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.deliveryBoy = deliveryBoyName;
    order.status = "OUT_FOR_DELIVERY";

    if (!order.otp) {
      order.otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    if (!order.timeline) order.timeline = {};
    if (!order.timeline.createdAt) order.timeline.createdAt = order.createdAt || new Date();
    if (!order.timeline.assignedShopAt && order.shop) {
      order.timeline.assignedShopAt = new Date();
    }
    if (!order.timeline.assignedDeliveryAt) {
      order.timeline.assignedDeliveryAt = new Date();
    }
    if (!order.timeline.pickedUpAt) {
      order.timeline.pickedUpAt = new Date();
    }

    await order.save();

    res.json({ message: "Delivery boy assigned", orderId: order.orderId, otp: order.otp });
  } catch (err) {
    console.error("assignDeliveryBoyToOrder", err);
    res.status(500).json({ message: "Failed to assign delivery boy" });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/mark-shop-paid
 */
export const markShopPaid = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.shopPaid = true;
    await order.save();

    res.json({ message: "Shop marked as paid", orderId: order.orderId });
  } catch (err) {
    console.error("markShopPaid", err);
    res.status(500).json({ message: "Failed to mark as paid" });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/status
 * body: { status } // one of pending|preparing|out_for_delivery|delivered|cancelled
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const map = {
      pending: "PENDING",
      preparing: "CONFIRMED",
      out_for_delivery: "OUT_FOR_DELIVERY",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
    };

    const dbStatus = map[status];
    if (!dbStatus) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = dbStatus;
    if (!order.timeline) order.timeline = {};
    const now = new Date();

    if (!order.timeline.createdAt) order.timeline.createdAt = order.createdAt || now;
    if (dbStatus === "DELIVERED") {
      order.timeline.deliveredAt = now;
    }
    if (dbStatus === "CANCELLED") {
      order.timeline.cancelledAt = now;
      order.cancelledAt = now;
    }

    await order.save();

    res.json({ message: "Status updated", orderId: order.orderId });
  } catch (err) {
    console.error("updateOrderStatusAdmin", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

/**
 * GET /api/admin/orders/:orderId/nearest-shops
 * Returns shops sorted by distance from order location.
 * If no valid location data exists or no shops found nearby, returns 10 random shops.
 */
export const getNearestShopsForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const baseLat = typeof order.lat === "number" ? order.lat : null;
    const baseLng = typeof order.lng === "number" ? order.lng : null;

    // Fetch all active shops with their products
    const shops = await Shop.find({ isActive: { $ne: false } })
      .populate("products", "name")
      .lean();

    // Check if we have no shops at all
    if (!shops || shops.length === 0) {
      return res.json([]);
    }

    // Check if order has valid location coordinates
    const hasValidOrderLocation = baseLat !== null && baseLng !== null;

    let withDistance = shops.map((s) => {
      let distanceKm = null;
      let hasValidShopLocation = false;

      const shopLat = s.address?.latitude;
      const shopLng = s.address?.longitude;

      // Check if shop has valid coordinates
      if (typeof shopLat === "number" && typeof shopLng === "number") {
        hasValidShopLocation = true;

        // Calculate distance only if both order and shop have valid locations
        if (hasValidOrderLocation) {
          distanceKm = getDistanceKm(baseLat, baseLng, shopLat, shopLng);
        }
      }

      return {
        id: s._id.toString(),
        address: s.address?.line1 || "",
        name: s.name,
        phone: s.phone,
        distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
        rating: s.rating || 4.5,
        products: Array.isArray(s.products)
          ? s.products.map((p) => p.name)
          : [],
        hasValidLocation: hasValidShopLocation,
      };
    });

    // Count shops with valid calculated distances
    const shopsWithValidDistance = withDistance.filter(
      (s) => s.distanceKm !== null
    );

    // If no shops have valid calculated distances (no order location OR no shop locations)
    // Return 10 random shops
    if (shopsWithValidDistance.length === 0) {
      // Shuffle array randomly
      const shuffled = withDistance.sort(() => Math.random() - 0.5);
      const randomShops = shuffled.slice(0, 10).map((s) => ({
        id: s.id,
        address: s.address,
        name: s.name,
        phone: s.phone,
        distanceKm: null, // Indicate distance is not available
        rating: s.rating,
        products: s.products,
      }));
      return res.json(randomShops);
    }

    // Sort shops by distance (shops with null distance go to end)
    withDistance.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    // Return sorted shops (remove hasValidLocation flag from response)
    const response = withDistance.map((s) => ({
      id: s.id,
      address: s.address,
      name: s.name,
      phone: s.phone,
      distanceKm: s.distanceKm,
      rating: s.rating,
      products: s.products,
    }));

    res.json(response);
  } catch (err) {
    console.error("getNearestShopsForOrder", err);
    res.status(500).json({ message: "Failed to load nearest shops" });
  }
};