import { Shop } from "../models/Shop.js"
import { Product } from "../models/Product.js"

// POST /api/shops
// POST /api/admin/shops
// POST /api/admin/shops
export const createShop = async (req, res) => {
  const {
    name,
    ownerName,
    phone,
    address,
    tags,
    isActive = true,
    productIds = [],
  } = req.body

  if (!name || !address?.line1) {
    return res.status(400).json({ message: "Name and address.line1 required" })
  }

  // Fetch product details to embed
  let shopProducts = []
  if (productIds.length > 0) {
    shopProducts = await Product.find(
      { _id: { $in: productIds } },
      { name: 1, category: 1, sellingPrice: 1, image: 1, unit: 1 }
    )
    
    if (shopProducts.length !== productIds.length) {
      return res.status(400).json({ 
        message: "Some products not found",
        found: shopProducts.length,
        expected: productIds.length 
      })
    }
  }

  const shopData = {
    name,
    ownerName,
    phone,
    address: {
      ...(address || {}),
    },
    tags,
    isActive,
    products: shopProducts.map(p => ({
      productId: p._id,
      name: p.name,
      category: p.category,
      sellingPrice: p.sellingPrice,
      image: p.image,
      unit: p.unit,
    }))
  }

  const shop = await Shop.create(shopData)

  res.status(201).json({
    ...shop.toObject(),
    assignedProducts: shop.products.length  // ✅ Direct count
  })
}



// GET /api/shops
export const listShops = async (_req, res) => {
  const shops = await Shop.find().sort({ createdAt: -1 })
  res.json(shops)
}


// PATCH /api/admin/shops/:id
export const updateShop = async (req, res) => {
  const { id } = req.params
  const shop = await Shop.findById(id)
  if (!shop) return res.status(404).json({ message: "Shop not found" })

  const {
    name,
    ownerName,
    phone,
    address,
    tags,
    isActive,
    latitude,
    longitude,
    productIds, // <-- NEW
  } = req.body

  if (name !== undefined) shop.name = name
  if (ownerName !== undefined) shop.ownerName = ownerName
  if (phone !== undefined) shop.phone = phone
  if (tags !== undefined) shop.tags = tags
  if (isActive !== undefined) shop.isActive = isActive

  // address / geo update (keep previous values if not provided)
  if (address || latitude !== undefined || longitude !== undefined) {
    shop.address = {
      ...(shop.address || {}),
      ...(address || {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    }
  }

  // ✅ handle productIds on update (same logic as create)
  if (Array.isArray(productIds)) {
    if (productIds.length === 0) {
      shop.products = []
    } else {
      const shopProducts = await Product.find(
        { _id: { $in: productIds } },
        { name: 1, category: 1, sellingPrice: 1, image: 1, unit: 1 },
      )

      if (shopProducts.length !== productIds.length) {
        return res.status(400).json({
          message: "Some products not found",
          found: shopProducts.length,
          expected: productIds.length,
        })
      }

      shop.products = shopProducts.map(p => ({
        productId: p._id,
        name: p.name,
        category: p.category,
        sellingPrice: p.sellingPrice,
        image: p.image,
        unit: p.unit,
      }))
    }
  }

  await shop.save()
  res.json(shop)
}

// POST /api/shops/:shopId/products  body: { productIds: [] }
export const assignProductsToShop = async (req, res) => {
  const { shopId } = req.params
  const { productIds } = req.body

  const shop = await Shop.findById(shopId)
  if (!shop) return res.status(404).json({ message: "Shop not found" })

  if (!Array.isArray(productIds)) {
    return res.status(400).json({ message: "productIds array required" })
  }

  await Product.updateMany(
    { _id: { $in: productIds } },
    { $addToSet: { shopIds: shop._id } },
  )

  res.json({ message: "Products assigned" })
}
