import mongoose from "mongoose"

const complaintSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        type: {
            type: String,
            enum: ["QUALITY", "DELIVERY", "PAYMENT", "OTHER"],
            required: true,
        },
        description: { type: String, required: true },
        images: [String],
        status: {
            type: String,
            enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
            default: "OPEN",
        },
        resolution: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolvedAt: Date,
    },
    { timestamps: true },
)

export const Complaint = mongoose.model("Complaint", complaintSchema)
