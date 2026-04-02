import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, unique: true, uppercase: true, required: true },
        type: {
            type: String,
            enum: ["FLAT", "PERCENT", "FREE_DELIVERY", "FIRST_ORDER", "CASHBACK"],
            required: true,
        },
        value: { type: Number, required: true },
        maxDiscount: { type: Number },          // cap for PERCENT type
        minOrderValue: { type: Number, default: 0 },
        maxUses: { type: Number, default: 0 },  // 0 = unlimited
        usedCount: { type: Number, default: 0 },
        perUserLimit: { type: Number, default: 1 },
        usedBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                count: { type: Number, default: 1 },
            },
        ],
        validFrom: { type: Date, required: true },
        validUntil: { type: Date, required: true },
        applicableRoles: {
            type: [String],
            enum: ["customer", "distributor"],
            default: ["customer"],
        },
        isActive: { type: Boolean, default: true },
        description: String,
    },
    { timestamps: true },
)

export const Coupon = mongoose.model("Coupon", couponSchema)
