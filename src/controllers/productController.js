import { Product } from "../models/Product.js"
import { Shop } from "../models/Shop.js"

const calcSellingPrice = (shopPrice, marginPercent) =>
  Math.round(shopPrice * (1 + marginPercent / 100))

// POST /api/products
export const createProduct = async (req, res) => {
  const {
    name,
    category,
    description,
    details,
    isVeg,
    rating,
    unit,
    shopPrice,
    marginPercent = 20,
    image,
    inStock = true,
    shopIds = [],
  } = req.body

  if (!name || !shopPrice) {
    return res.status(400).json({ message: "Name and shopPrice required" })
  }

  const sellingPrice = calcSellingPrice(Number(shopPrice), Number(marginPercent))

  const product = await Product.create({
    name,
    category,
    description,
    details,
    isVeg,
    rating,
    unit,
    shopPrice,
    marginPercent,
    sellingPrice,
    image,
    inStock,
    shopIds,
  })

  res.status(201).json(product)
}

// GET /api/products
export const listProducts = async (req, res) => {
  const { shopId, search } = req.query

  const filter = {}
  if (shopId) filter.shopIds = shopId
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ]
  }

  const products = await Product.find(filter).sort({ createdAt: -1 })

  const isAdmin = req.user?.isAdmin // adapt to your auth

  // admin: raw docs
  if (isAdmin) {
    return res.json(products)
  }

  // non‑admin: transformed view
  const publicProducts = products.map(p => {
    const obj = p.toObject()

    const shopPrice = obj.shopPrice ?? 0
    const marginPercent = obj.marginPercent ?? 0
    const priceWithMargin =
      obj.sellingPrice ??
      Math.round(shopPrice * (1 + marginPercent / 100))

    return {
      _id: obj._id,
      name: obj.name,
      category: obj.category,
      description: obj.description,
      image: obj.image,
      unit: obj.unit,
      isVeg: obj.isVeg,
      rating: obj.rating,
      // combined price (shop + margin)
      price: priceWithMargin,
      // optional: send basic sponsor info
      sponsor: obj.sponsor
        ? {
            shopId: obj.sponsor.shopId,
            shopName: obj.sponsor.shopName,
            discountPercent: obj.sponsor.discountPercent,
            area: obj.sponsor.area,
          }
        : undefined,
      // explicitly hide internal fields: shopPrice, marginPercent, inStock, shopIds
    }
  })

  res.json(publicProducts)
}

export const getProductDetails = async (req, res) => {
  const { productId } = req.params
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ message: "Product not found" })
        const isAdmin = req.user?.isAdmin

        if (!isAdmin) {
            const obj = product.toObject()
            const shopPrice = obj.shopPrice ?? 0
            const marginPercent = obj.marginPercent ?? 0
            const priceWithMargin =
            obj.sellingPrice ?? Math.round(shopPrice * (1 + marginPercent / 100))

            // Fetch minimum 10 related products based on category, excluding current product
            const relatedProduct = await Product.find({
            category: obj.category,
            _id: { $ne: obj._id }
            })
            .limit(10)
            .select("_id name image price category")
            .lean()

            const publicProduct = {
            _id: obj._id,
            name: obj.name,
            category: obj.category,
            description: obj.description,
            image: obj.image,
            unit: obj.unit,
            isVeg: obj.isVeg,
            rating: obj.rating,
            price: priceWithMargin,
            sponsor: obj.sponsor
                ? {
                shopId: obj.sponsor.shopId,
                shopName: obj.sponsor.shopName,
                discountPercent: obj.sponsor.discountPercent,
                area: obj.sponsor.area,
                }
                : undefined,
            relatedProduct
            }
            return res.json(publicProduct)
        }
    res.json(product)
}
// PATCH /api/products/:id
export const updateProduct = async (req, res) => {
  const { id } = req.params
  const product = await Product.findById(id)
  if (!product) return res.status(404).json({ message: "Not found" })

  const {
    name,
    category,
    description,
    details,
    isVeg,
    rating,
    unit,
    shopPrice,
    marginPercent,
    image,
    inStock,
    shopIds,
  } = req.body

  if (name !== undefined) product.name = name
  if (category !== undefined) product.category = category
  if (description !== undefined) product.description = description
  if (details !== undefined) product.details = details
  if (isVeg !== undefined) product.isVeg = isVeg
  if (rating !== undefined) product.rating = rating
  if (unit !== undefined) product.unit = unit
  if (image !== undefined) product.image = image
  if (inStock !== undefined) product.inStock = inStock
  if (shopIds !== undefined) product.shopIds = shopIds

  if (shopPrice !== undefined) product.shopPrice = shopPrice
  if (marginPercent !== undefined) product.marginPercent = marginPercent

  if (shopPrice !== undefined || marginPercent !== undefined) {
    product.sellingPrice = calcSellingPrice(
      Number(product.shopPrice),
      Number(product.marginPercent),
    )
  }

  await product.save()
  res.json(product)
}

export const setSponsor = async (req, res) => {
  const { productId } = req.params
  const { shopId, discountPercent, area } = req.body

  const product = await Product.findById(productId)
  if (!product) return res.status(404).json({ message: "Product not found" })

  const shop = await Shop.findById(shopId)
  if (!shop) return res.status(404).json({ message: "Shop not found" })

  product.sponsor = {
    shopId: shop._id,
    shopName: shop.name,
    discountPercent,
    area: area || shop.address?.city || shop.address?.line1 || ""
  }

  await product.save()
  res.json(product)
}
export const clearSponsor = async (req, res) => {
  const { productId } = req.params
  const product = await Product.findById(productId)
  if (!product) return res.status(404).json({ message: "Product not found" })

  product.sponsor = undefined
  await product.save()
  res.json(product)
}