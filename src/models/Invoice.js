import mongoose from "mongoose"

const invoiceItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        variant: String,
        qty: Number,
        unitPrice: Number,
        total: Number,
        gst: { type: Number, default: 0 },
    },
    { _id: false },
)

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: { type: String, unique: true, required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        distributor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: [invoiceItemSchema],
        subtotal: { type: Number, required: true },
        gstTotal: { type: Number, default: 0 },
        grandTotal: { type: Number, required: true },
        paymentTerms: {
            type: String,
            enum: ["NET_7", "NET_15", "NET_30", "COD"],
            default: "COD",
        },
        dueDate: Date,
        status: {
            type: String,
            enum: ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"],
            default: "UNPAID",
        },
        paidAmount: { type: Number, default: 0 },
        paidAt: Date,
    },
    { timestamps: true },
)

export const Invoice = mongoose.model("Invoice", invoiceSchema)
