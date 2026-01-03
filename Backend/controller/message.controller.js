import { getReceiverSocketId, io } from "../SocketIO/server.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
export const sendMessage = async (req, res) => {
  try {
    const { message, messageType = "text", mediaUrl = "" } = req.body;
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
      isDelivered: !!getReceiverSocketId(receiverId), // Delivered if receiver is online
    });
    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    // await conversation.save()
    // await newMessage.save();
    await Promise.all([conversation.save(), newMessage.save()]); // run parallel
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
    }).populate("messages");
    if (!conversation) {
      return res.status(201).json([]);
    }
    const messages = conversation.messages;
    
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
