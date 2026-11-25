import "dotenv/config";
import express from "express";
import authRouter from "./routes/auth.js";
import documentRouter from "./routes/documents.js";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Middleware to allow requests from DocAI frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/documents", documentRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});

export default app;
