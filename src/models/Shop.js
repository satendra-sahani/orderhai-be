import mongoose from "mongoose"
const productRefSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    category: String,
    sellingPrice: Number,
    image: String,
    unit: String,
}, { _id: false })

const shopSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        ownerName: String,
        phone: String,
        address: {
            line1: { type: String, required: true },
            line2: String,
            city: String,
            state: String,
            pincode: String,
            latitude: Number,
            longitude: Number,
        },
        isActive: { type: Boolean, default: true },
        tags: [String],
        products: [productRefSchema],
    },
    { timestamps: true },
)

export const Shop = mongoose.model("Shop", shopSchema)
