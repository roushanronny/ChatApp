import React, { useState } from "react";
import useConversation from "../statemanage/useConversation.js";
import axios from "axios";
import { getApiUrl } from "../config/api.js";
const useSendMessage = () => {
  const [loading, setLoading] = useState(false);
  const { messages, setMessage, selectedConversation } = useConversation();
  const sendMessages = async (message = "", messageType = "text", mediaUrl = "", replyTo = null) => {
    if (!message && !mediaUrl) {
      console.error("No message or media to send");
      return;
    }
    if (!selectedConversation?._id) {
      console.error("No conversation selected");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Sending message:", { messageType, hasMedia: !!mediaUrl, mediaLength: mediaUrl?.length, replyTo });
      const res = await axios.post(
        getApiUrl(`/api/message/send/${selectedConversation._id}`),
        { 
          message: message || "",
          messageType,
          mediaUrl: mediaUrl || "",
          replyTo: replyTo || null
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log("Message sent successfully:", res.data);
      
      // Add message to local state immediately for instant UI update
      // Socket listener will also handle incoming messages from other users
      setMessage([...messages, res.data]);
      setLoading(false);
    } catch (error) {
      console.error("Error in send messages:", error.response?.data || error.message);
      setLoading(false);
      throw error; // Re-throw to handle in component
    }
  };
  return { loading, sendMessages };
};

export default useSendMessage;
