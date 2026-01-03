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
