import mongoose from "mongoose"

const leaveRequestSchema = new mongoose.Schema(
    {
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: { type: Date, required: true },
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
)

export const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema)
