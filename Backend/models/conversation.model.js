import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "./message.model.js";
const conversationSchema = new mongoose.Schema(
  {
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: Message,
        default: [],
      },
    ],
    mutedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
      },
      mutedUntil: {
        type: Date,
        default: null, // null means permanently muted, or a date for temporary mute
      },
    }],
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
    },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("conversation", conversationSchema);
export default Conversation;
