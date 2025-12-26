import express from "express"
import cors from "cors"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import shopRoutes from "./routes/shopRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import adminRoutes  from "./routes/adminRoutes.js"

const app = express()

app.use(cors({ origin: "*" }))
app.use(express.json())

app.get("/health", (_req, res) => res.json({ status: "ok" }))

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
