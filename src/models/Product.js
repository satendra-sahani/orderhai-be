import mongoose from "mongoose"


const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: String,
        description: String,
        details: String,
        isVeg: { type: Boolean, default: true },
        rating: { type: Number, default: 4.5 },

        unit: String,                // "1 kg", "1 pc", etc.
        shopPrice: { type: Number, required: true },
        marginPercent: { type: Number, default: 20 },
        sellingPrice: { type: Number, required: true },

        image: String,
        inStock: { type: Boolean, default: true },

        shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
        sponsor: {
            shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
            shopName: String,
            discountPercent: Number,
            area: String
        },
       
    },
    { timestamps: true },
)

export const Product = mongoose.model("Product", productSchema)
