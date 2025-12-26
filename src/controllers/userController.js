// logged-in user profile & addresses
import { Product } from "../models/Product.js"
import { User } from "../models/User.js"

// GET /api/users/me
export const getMe = async (req, res) => {
  const u = req.user
  res.json({
    id: u._id,
    phone: u.phone,
    name: u.name,
    lastLoginAt: u.lastLoginAt,
    lastLoginIp: u.lastLoginIp,
    lastLoginDevice: u.lastLoginDevice,
    addresses: u.addresses,
  })
}

// PUT /api/users/me { name? }
export const updateProfile = async (req, res) => {
  const { name } = req.body
  if (name) req.user.name = name
  await req.user.save()
  res.json({ message: "Updated", user: { id: req.user._id, name: req.user.name } })
}

// POST /api/users/addresses
// body: { label, line1, line2, city, state, pincode, latitude, longitude, isDefault }
export const addAddress = async (req, res) => {
  const {
    label,
    line1,
    line2,
    city,
    state,
    pincode,
    latitude,
    longitude,
    isDefault,
  } = req.body

  if (!line1) return res.status(400).json({ message: "line1 required" })

  if (isDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = false
    })
  }

  req.user.addresses.push({
    label,
    line1,
    line2,
    city,
    state,
    pincode,
    latitude,
    longitude,
    isDefault: Boolean(isDefault),
  })
  await req.user.save()
  res.json({ message: "Address added", addresses: req.user.addresses })
}

// PUT /api/users/addresses/:addressId
export const updateAddress = async (req, res) => {
  const { addressId } = req.params
  const addr = req.user.addresses.id(addressId)
  if (!addr) return res.status(404).json({ message: "Address not found" })

  const {
    label,
    line1,
    line2,
    city,
    state,
    pincode,
    latitude,
    longitude,
    isDefault,
  } = req.body

  if (line1 !== undefined) addr.line1 = line1
  if (label !== undefined) addr.label = label
  if (line2 !== undefined) addr.line2 = line2
  if (city !== undefined) addr.city = city
  if (state !== undefined) addr.state = state
  if (pincode !== undefined) addr.pincode = pincode
  if (latitude !== undefined) addr.latitude = latitude
  if (longitude !== undefined) addr.longitude = longitude

  if (isDefault !== undefined) {
    if (isDefault) {
      req.user.addresses.forEach((a) => {
        a.isDefault = false
      })
      addr.isDefault = true
    } else {
      addr.isDefault = false
    }
  }

  await req.user.save()
  res.json({ message: "Address updated", addresses: req.user.addresses })
}

// DELETE /api/users/addresses/:addressId
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params
  const addr = req.user.addresses.id(addressId)
  if (!addr) return res.status(404).json({ message: "Address not found" })

  const index = req.user.addresses.findIndex(a => a._id.toString() === addressId)
  if (index !== -1) {
    req.user.addresses.splice(index, 1)
    await req.user.save()
    res.json({ message: "Address removed", addresses: req.user.addresses })
  } else {
    res.status(404).json({ message: "Address not found" })
  }
}


export const addFavorite = async (req, res) => {
  const user = req.user;
  const { productId } = req.params;

  const prod = await Product.findById(productId);
  if (!prod) return res.status(404).json({ message: "Product not found" });

  if (!user.favorites) user.favorites = [];
  if (!user.favorites.some(id => id.toString() === productId)) {
    user.favorites.push(productId);
    await user.save();
  }

  res.json({ message: "Added to favorites", favorites: user.favorites });
};

// DELETE /api/users/favorites/:productId
export const removeFavorite = async (req, res) => {
  const user = req.user;
  const { productId } = req.params;

  user.favorites = (user.favorites || []).filter(
    id => id.toString() !== productId
  );
  await user.save();

  res.json({ message: "Removed from favorites", favorites: user.favorites });
};

// GET /api/users/favorites
export const listFavorites = async (req, res) => {
  const user = req.user;
  await user.populate("favorites");
  res.json(user.favorites);
};
