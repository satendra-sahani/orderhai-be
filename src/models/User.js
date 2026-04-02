import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const addressSchema = new mongoose.Schema(
    {
        label: { type: String, default: "Home" },
        line1: { type: String, required: true },
        line2: String,
        city: String,
        state: String,
        pincode: String,
        latitude: Number,
        longitude: Number,
        isDefault: { type: Boolean, default: false },
    },
    { _id: true },
)

const distributorProfileSchema = new mongoose.Schema(
    {
        businessName: String,
        gstin: String,
        territory: String,
        creditLimit: { type: Number, default: 0 },
        creditUsed: { type: Number, default: 0 },
        paymentTerms: {
            type: String,
            enum: ["NET_7", "NET_15", "NET_30", "COD"],
            default: "COD",
        },
        minOrderValue: { type: Number, default: 0 },
        isApproved: { type: Boolean, default: false },
        approvedAt: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { _id: false },
)

const deliveryProfileSchema = new mongoose.Schema(
    {
        vehicleType: String,
        vehicleNumber: String,
        assignedZone: String,
        isAvailable: { type: Boolean, default: true },
        currentLocation: {
            lat: Number,
            lng: Number,
        },
        bankAccount: {
            accountNumber: String,
            ifsc: String,
            accountHolder: String,
        },
        totalEarnings: { type: Number, default: 0 },
        pendingSettlement: { type: Number, default: 0 },
    },
    { _id: false },
)

const userSchema = new mongoose.Schema(
    {
        phone: { type: String, unique: true, sparse: true },
        pendingPhone: { type: String, unique: true, sparse: true },
        email: { type: String, unique: true, sparse: true },
        name: String,

        passwordHash: String,
        otpCode: String,
        otpExpiresAt: Date,

        lastLoginAt: Date,
        lastLoginIp: String,
        lastLoginDevice: String,

        role: {
            type: String,
            enum: ["customer", "distributor", "delivery_boy", "admin"],
            default: "customer",
        },

        distributorProfile: distributorProfileSchema,
        deliveryProfile: deliveryProfileSchema,

        wallet: { type: Number, default: 0 },
        referralCode: { type: String, unique: true, sparse: true },
        referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        addresses: [addressSchema],
        favorites: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
        ],
    },
    { timestamps: true },
)

userSchema.methods.setPassword = async function (password) {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(password, salt)
}

userSchema.methods.comparePassword = async function (password) {
    if (!this.passwordHash) return false
    return bcrypt.compare(password, this.passwordHash)
}

export const User = mongoose.model("User", userSchema)
