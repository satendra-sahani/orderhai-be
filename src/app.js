import express from "express"
import cors from "cors"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import shopRoutes from "./routes/shopRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import adminRoutes  from "./routes/adminRoutes.js"
import { connectDB } from "./config/db.js"

const app = express()

app.use(cors({ origin: "*" }))
app.use(express.json())

// Connect to DB on each request (serverless-friendly)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection failed:", error);
    res.status(503).json({ message: "Database connection failed" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/shops", shopRoutes)
app.use("/api/products", productRoutes)
app.use("/api/admin", adminRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || "Server error" })
})

export default app