// src/server.js
import app from "./app.js"
import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js"

const start = async () => {
  try {
    await connectDB()
    const port = PORT || 5000
    app.listen(port, () => {
      console.log(`API server running on http://localhost:${port}`)
    })
  } catch (err) {
    console.error("Failed to start server:", err.message)
    process.exit(1)
  }
}

start()
