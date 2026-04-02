import mongoose from "mongoose"

const subscriptionItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variant: String,
        qty: { type: Number, required: true, min: 1 },
    },
    { _id: false },
)

const subscriptionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: [subscriptionItemSchema],
        frequency: {
            type: String,
            enum: ["DAILY", "ALT_DAYS", "WEEKLY", "CUSTOM"],
            default: "DAILY",
        },
        customDays: [Number], // 0=Sun, 1=Mon, ... 6=Sat (for CUSTOM frequency)
        deliverySlot: {
            type: String,
            enum: ["MORNING", "AFTERNOON", "EVENING"],
            default: "MORNING",
        },
        address: {
            label: String,
            line1: String,
            line2: String,
            city: String,
            state: String,
            pincode: String,
            latitude: Number,
            longitude: Number,
        },
        startDate: { type: Date, required: true },
        endDate: Date,
        status: {
            type: String,
            enum: ["ACTIVE", "PAUSED", "CANCELLED"],
            default: "ACTIVE",
        },
        pausedUntil: Date,
        paymentMethod: {
            type: String,
            enum: ["COD", "ONLINE", "WALLET"],
            default: "COD",
        },
        totalDelivered: { type: Number, default: 0 },
        nextDeliveryDate: Date,
    },
    { timestamps: true },
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)
