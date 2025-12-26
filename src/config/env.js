import dotenv from "dotenv"
dotenv.config()

export const { PORT, MONGO_URI = "mongodb+srv://aiwats748:vSGV3vcPmrb4rOZ1@cluster0.swjkv.mongodb.net/aiwats", JWT_SECRET, JWT_EXPIRES_IN } = process.env
