import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoute from "./routes/user.route.js";
import messageRoute from "./routes/message.route.js";
import callRoute from "./routes/call.route.js";
import { app, server } from "./SocketIO/server.js";

dotenv.config();

// middleware
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images/videos
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const PORT = process.env.PORT || 5004;
const URI = process.env.MONGODB_URI;

mongoose.connect(URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error.message);
        console.log("\n⚠️  Fix this issue:");
        console.log("1. Check your IP is whitelisted in MongoDB Atlas");
        console.log("2. Go to: https://cloud.mongodb.com/ → Network Access");
        console.log("3. Add your current IP or 0.0.0.0/0 (for testing)\n");
    });

//routes
app.use("/api/user", userRoute);
app.use("/api/message", messageRoute);
app.use("/api/call", callRoute);

server.listen(PORT, () => {
    console.log(`Server is Running on port ${PORT}`);
});