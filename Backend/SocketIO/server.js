import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// realtime message code goes here
export const getReceiverSocketId = (receiverId) => {
  return users[receiverId];
};

const users = {};

// used to listen events on server side.
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  const userId = socket.handshake.query.userId;
  if (userId) {
    users[userId] = socket.id;
    console.log("Hello ", users);
  }
  // used to send the events to all connected users
  io.emit("getOnlineUsers", Object.keys(users));

  // Typing indicator
  socket.on("typing", ({ receiverId, senderId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId });
    }
  });

  socket.on("stopTyping", ({ receiverId, senderId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { senderId });
    }
  });

  // Call events - For offer/answer SDP exchange
  socket.on("callUser", ({ to, signalData, from, name, callType }) => {
    const receiverSocketId = getReceiverSocketId(to);
    console.log("Call event received (offer/answer):", { to, from, name, callType, receiverSocketId, signalType: signalData?.type });
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callUser", { signalData, from, name, callType });
      console.log("Call forwarded to:", receiverSocketId);
    } else {
      console.log("Receiver not online:", to);
    }
  });

  // ICE candidate exchange (separate from offer/answer)
  socket.on("iceCandidate", ({ to, candidate, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    console.log("ICE candidate received:", { to, from, receiverSocketId });
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("iceCandidate", { candidate, from });
      console.log("ICE candidate forwarded to:", receiverSocketId);
    } else {
      console.log("Receiver not online for ICE candidate:", to);
    }
  });

  socket.on("answerCall", ({ to, signal, from }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callAccepted", { signal, from });
    }
  });

  socket.on("endCall", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    console.log("endCall received:", { to, receiverSocketId, allUsers: Object.keys(users) });
    if (receiverSocketId) {
      console.log("Forwarding callEnded to:", receiverSocketId);
      io.to(receiverSocketId).emit("callEnded");
    } else {
      console.log("Receiver not found for endCall, userId:", to);
    }
  });

  // used to listen client side events emitted by server side (server & client)
  socket.on("disconnect", () => {
    console.log("a user disconnected", socket.id);
    delete users[userId];
    io.emit("getOnlineUsers", Object.keys(users));
  });
});

export { app, io, server };
