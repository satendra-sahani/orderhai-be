import mongoose from "mongoose"

const referralSchema = new mongoose.Schema(
    {
        referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        referee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        referralCode: { type: String, required: true },
        reward: { type: Number, default: 50 }, // reward amount in rupees
        status: {
            type: String,
            enum: ["PENDING", "CREDITED"],
            default: "PENDING",
        },
        creditedAt: Date,
    },
    { timestamps: true },
)

export const Referral = mongoose.model("Referral", referralSchema)
