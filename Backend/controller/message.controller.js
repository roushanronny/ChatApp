import { getReceiverSocketId, io } from "../SocketIO/server.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

export const sendMessage = async (req, res) => {
  try {
    const { message, messageType = "text", mediaUrl = "", replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id; // current logged in user
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        members: [senderId, receiverId],
      });
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      message: message || "",
      messageType,
      mediaUrl,
      replyTo: replyTo || null,
      isDelivered: !!getReceiverSocketId(receiverId), // Delivered if receiver is online
    });
    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    await newMessage.save();
    await conversation.save();
    
    // Populate replyTo before sending
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo", "message messageType mediaUrl senderId");
    }
    
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      // Mark as delivered if receiver is online
      newMessage.isDelivered = true;
      await newMessage.save();
    }
    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessage = async (req, res) => {
  try {
    const { id: chatUser } = req.params;
    const senderId = req.user._id; // current logged in user
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, chatUser] },
    }).populate({
      path: "messages",
      populate: [
        {
          path: "replyTo",
          select: "message messageType mediaUrl senderId",
        },
        {
          path: "reactions.userId",
          select: "fullname",
        },
      ],
    });
    if (!conversation) {
      return res.status(201).json([]);
    }
    // Filter out deleted messages
    const messages = conversation.messages.filter(msg => !msg.isDeleted);
    
    // Mark messages as seen
    await Message.updateMany(
      { 
        receiverId: senderId, 
        senderId: chatUser,
        isSeen: false 
      },
      { 
        isSeen: true, 
        seenAt: new Date() 
      }
    );
    
    // Emit seen status to sender
    const senderSocketId = getReceiverSocketId(chatUser);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { receiverId: senderId });
    }
    
    res.status(201).json(messages);
  } catch (error) {
    console.log("Error in getMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessageAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(messageId);
    if (!message || message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    message.isSeen = true;
    message.seenAt = new Date();
    await message.save();
    
    // Notify sender
    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageSeen", { messageId, seenAt: message.seenAt });
    }
    
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in markMessageAsSeen", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add or remove reaction
export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji = "❤️" } = req.body;
    const userId = req.user._id;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === userId.toString()
    );
    
    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => r.userId.toString() !== userId.toString()
      );
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }
    
    await message.save();
    await message.populate("reactions.userId", "fullname");
    
    // Notify receiver
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", { messageId, reactions: message.reactions });
    }
    
    // Notify sender if different from receiver
    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId && message.senderId.toString() !== message.receiverId.toString()) {
      io.to(senderSocketId).emit("messageReaction", { messageId, reactions: message.reactions });
    }
    
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in toggleReaction", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Forward message
export const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { receiverIds } = req.body; // Array of receiver IDs
    const senderId = req.user._id;
    
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    const forwardedMessages = [];
    
    for (const receiverId of receiverIds) {
      let conversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] },
      });
      
      if (!conversation) {
        conversation = await Conversation.create({
          members: [senderId, receiverId],
        });
      }
      
      const forwardedMessage = new Message({
        senderId,
        receiverId,
        message: originalMessage.message,
        messageType: originalMessage.messageType,
        mediaUrl: originalMessage.mediaUrl,
        isDelivered: !!getReceiverSocketId(receiverId),
      });
      
      await forwardedMessage.save();
      conversation.messages.push(forwardedMessage._id);
      await conversation.save();
      
      // Notify receiver
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", forwardedMessage);
      }
      
      forwardedMessages.push(forwardedMessage);
    }
    
    res.status(201).json({ messages: forwardedMessages });
  } catch (error) {
    console.log("Error in forwardMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Star or unstar message
export const toggleStar = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Only sender or receiver can star
    if (message.senderId.toString() !== userId.toString() && 
        message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    message.isStarred = !message.isStarred;
    await message.save();
    
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in toggleStar", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only sender can delete message" });
    }
    
    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    // Notify receiver
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }
    
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get starred messages
export const getStarredMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const starredMessages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      isStarred: true,
      isDeleted: false,
    })
      .populate("senderId", "fullname profilePicture")
      .populate("receiverId", "fullname profilePicture")
      .populate("replyTo", "message messageType mediaUrl senderId")
      .populate("reactions.userId", "fullname")
      .sort({ createdAt: -1 });
    
    res.status(200).json(starredMessages);
  } catch (error) {
    console.log("Error in getStarredMessages", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Clear chat - Delete all messages in a conversation
export const clearChat = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    
    const conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Delete all messages in this conversation
    await Message.updateMany(
      { _id: { $in: conversation.messages } },
      { isDeleted: true, deletedAt: new Date() }
    );
    
    // Clear messages array from conversation
    conversation.messages = [];
    await conversation.save();
    
    // Notify receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chatCleared", { conversationId: conversation._id });
    }
    
    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (error) {
    console.log("Error in clearChat", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mute/Unmute notifications for a chat
export const toggleMuteChat = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const { mutedUntil } = req.body; // null for permanent, or Date for temporary
    
    const conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const existingMute = conversation.mutedBy.find(
      m => m.userId.toString() === senderId.toString()
    );
    
    if (existingMute) {
      // Unmute - remove from mutedBy array
      conversation.mutedBy = conversation.mutedBy.filter(
        m => m.userId.toString() !== senderId.toString()
      );
    } else {
      // Mute - add to mutedBy array
      conversation.mutedBy.push({
        userId: senderId,
        mutedUntil: mutedUntil || null,
      });
    }
    
    await conversation.save();
    
    res.status(200).json({
      message: existingMute ? "Chat unmuted successfully" : "Chat muted successfully",
      isMuted: !existingMute,
    });
  } catch (error) {
    console.log("Error in toggleMuteChat", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export chat - Generate text file with all messages
export const exportChat = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    
    // Get receiver info for export
    const User = (await import("../models/user.model.js")).default;
    const receiver = await User.findById(receiverId).select("fullname");
    const receiverName = receiver?.fullname || "Unknown";
    
    const conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate({
      path: "messages",
      populate: [
        { path: "senderId", select: "fullname" },
        { path: "receiverId", select: "fullname" },
      ],
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const messages = conversation.messages.filter(msg => !msg.isDeleted);
    
    // Generate chat export text
    let chatText = `WhatsApp Chat Export\n`;
    chatText += `========================\n\n`;
    chatText += `Conversation with: ${receiverName}\n`;
    chatText += `Exported on: ${new Date().toLocaleString()}\n\n`;
    chatText += `Messages (${messages.length}):\n`;
    chatText += `========================\n\n`;
    
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleString();
      const senderName = msg.senderId?.fullname || "Unknown";
      let messageContent = "";
      
      if (msg.messageType === "text") {
        messageContent = msg.message || "[No message]";
      } else if (msg.messageType === "image") {
        messageContent = `[Image] ${msg.message || ""}`;
      } else if (msg.messageType === "video") {
        messageContent = `[Video] ${msg.message || ""}`;
      } else if (msg.messageType === "audio") {
        messageContent = `[Audio] ${msg.message || ""}`;
      } else if (msg.messageType === "file") {
        messageContent = `[File] ${msg.message || ""}`;
      } else {
        messageContent = `[${msg.messageType.toUpperCase()}] ${msg.message || "Media"}`;
      }
      
      chatText += `${date} - ${senderName}:\n`;
      chatText += `${messageContent}\n\n`;
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${receiverName}-${Date.now()}.txt"`);
    res.status(200).send(chatText);
  } catch (error) {
    console.log("Error in exportChat", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete chat - Delete the entire conversation
export const deleteChat = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    
    const conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Delete all messages
    await Message.deleteMany({ _id: { $in: conversation.messages } });
    
    // Delete conversation
    await Conversation.findByIdAndDelete(conversation._id);
    
    // Notify receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chatDeleted", { conversationId: conversation._id });
    }
    
    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.log("Error in deleteChat", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
