import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const addressSchema = new mongoose.Schema(
    {
        label: { type: String, default: "Home" },           // Home / Office etc.
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

const userSchema = new mongoose.Schema(
    {
        phone: { type: String, unique: true, sparse: true },
        pendingPhone: { type: String, unique: true, sparse: true },
        email: { type: String, unique: true, sparse: true },
        name: String,

        passwordHash: String,        // for password login if needed
        otpCode: String,
        otpExpiresAt: Date,

        lastLoginAt: Date,
        lastLoginIp: String,
        lastLoginDevice: String,
        isAdmin: { type: Boolean, default: false },

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
