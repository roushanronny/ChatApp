import express from "express";
import { 
  getMessage, 
  sendMessage, 
  markMessageAsSeen,
  toggleReaction,
  forwardMessage,
  toggleStar,
  deleteMessage,
  getStarredMessages,
  clearChat,
  toggleMuteChat,
  exportChat,
  deleteChat,
  getChatMedia
} from "../controller/message.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router();
router.post("/send/:id", secureRoute, sendMessage);
router.get("/get/:id", secureRoute, getMessage);
router.put("/seenMessage/:messageId", secureRoute, markMessageAsSeen);
router.put("/react/:messageId", secureRoute, toggleReaction);
router.post("/forward/:messageId", secureRoute, forwardMessage);
router.put("/star/:messageId", secureRoute, toggleStar);
router.delete("/delete/:messageId", secureRoute, deleteMessage);
router.get("/starred", secureRoute, getStarredMessages);

// Chat menu actions
router.delete("/clear/:id", secureRoute, clearChat);
router.put("/mute/:id", secureRoute, toggleMuteChat);
router.get("/export/:id", secureRoute, exportChat);
router.delete("/chat/:id", secureRoute, deleteChat);
router.get("/media/:id", secureRoute, getChatMedia);

export default router;
