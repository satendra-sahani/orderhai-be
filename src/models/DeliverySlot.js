import mongoose from "mongoose"

const deliverySlotSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },      // "Morning", "Afternoon", "Evening"
        code: { type: String, required: true, unique: true }, // "MORNING", "AFTERNOON", "EVENING"
        startTime: { type: String, required: true },  // "06:00"
        endTime: { type: String, required: true },    // "09:00"
        cutoffTime: { type: String, required: true }, // "05:00" - order must be placed before this
        maxOrders: { type: Number, default: 50 },     // capacity per slot per zone
        isActive: { type: Boolean, default: true },
        zones: [String],                               // zone codes this slot serves
    },
    { timestamps: true },
)

export const DeliverySlot = mongoose.model("DeliverySlot", deliverySlotSchema)
