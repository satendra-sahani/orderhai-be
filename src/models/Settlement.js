import mongoose from "mongoose"

const settlementSchema = new mongoose.Schema(
    {
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        period: {
            from: { type: Date, required: true },
            to: { type: Date, required: true },
        },
        totalDeliveries: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
        netAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSED", "PAID"],
            default: "PENDING",
        },
        paidAt: Date,
        transactionRef: String,
    },
    { timestamps: true },
)

export const Settlement = mongoose.model("Settlement", settlementSchema)
