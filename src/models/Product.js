import mongoose from "mongoose"

const variantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },    // "500ml", "1L", "2L", "5L"
        sku: String,
        sellingPrice: { type: Number, required: true },
        shopPrice: { type: Number, required: true },
        b2bPrice: { type: Number },                 // wholesale price for distributors
        stock: { type: Number, default: 0 },
        minB2BQty: { type: Number, default: 1 },    // minimum qty for B2B orders
    },
    { _id: true },
)

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: String,
        subcategory: String,
        description: String,
        details: String,
        isVeg: { type: Boolean, default: true },
        rating: { type: Number, default: 4.5 },

        unit: String,                // "1 kg", "500 ml", etc.
        shopPrice: { type: Number, required: true },
        marginPercent: { type: Number, default: 20 },
        sellingPrice: { type: Number, required: true },

        image: String,
        inStock: { type: Boolean, default: true },

        variants: [variantSchema],

        shelfLife: { type: Number },               // days
        storageTemp: { type: String },             // "2-8°C"
        isSubscribable: { type: Boolean, default: false },
        tags: [String],                            // "bestseller", "new", etc.

        shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
        sponsor: {
            shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
            shopName: String,
            discountPercent: Number,
            area: String,
        },
    },
    { timestamps: true },
)

export const Product = mongoose.model("Product", productSchema)
