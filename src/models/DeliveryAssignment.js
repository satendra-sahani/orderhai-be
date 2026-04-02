import mongoose from "mongoose"

const deliveryAssignmentSchema = new mongoose.Schema(
    {
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: { type: Date, required: true },
        slot: {
            type: String,
            enum: ["MORNING", "AFTERNOON", "EVENING"],
            required: true,
        },
        zone: String,
        orders: [
            { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        ],
        status: {
            type: String,
            enum: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"],
            default: "ASSIGNED",
        },
        startedAt: Date,
        completedAt: Date,
        totalEarnings: { type: Number, default: 0 },
    },
    { timestamps: true },
)

export const DeliveryAssignment = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema)
