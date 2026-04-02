import mongoose from "mongoose"

const zoneSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },     // "Jayanagar", "Koramangala"
        code: { type: String, required: true, unique: true },
        city: { type: String, default: "Bangalore" },
        pincodes: [String],                          // pincodes covered by this zone
        deliveryFee: { type: Number, default: 20 },
        freeDeliveryAbove: { type: Number, default: 199 },
        isActive: { type: Boolean, default: true },
        assignedDeliveryBoys: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ],
    },
    { timestamps: true },
)

export const Zone = mongoose.model("Zone", zoneSchema)
