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

if (!URI) {
    console.error("\n❌ ERROR: MONGODB_URI environment variable is not set!");
    console.error("Please add MONGODB_URI in Railway dashboard → Variables tab");
    console.error("Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp\n");
    process.exit(1);
}

mongoose.connect(URI)
    .then(() => {
        console.log("✅ Connected to MongoDB successfully");
    })
    .catch((error) => {
        console.error("\n❌ MongoDB connection error:", error.message);
        console.error("\n⚠️  Fix this issue:");
        console.error("1. Check MONGODB_URI is set correctly in Railway Variables");
        console.error("2. Check your IP is whitelisted in MongoDB Atlas");
        console.error("3. Go to: https://cloud.mongodb.com/ → Network Access");
        console.error("4. Add 0.0.0.0/0 to allow all IPs (or Railway IPs)\n");
    });

//routes
app.use("/api/user", userRoute);
app.use("/api/message", messageRoute);
app.use("/api/call", callRoute);

server.listen(PORT, () => {
    console.log(`Server is Running on port ${PORT}`);
});