import dotenv from "dotenv"
dotenv.config()

export const { PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN } = process.env
