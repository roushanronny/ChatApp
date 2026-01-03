import React, { useEffect, useState, useRef } from "react";
import useConversation from "../statemanage/useConversation.js";
import axios from "axios";
import { getApiUrl } from "../config/api.js";
import { getToken } from "../utils/getToken.js";
const useGetMessage = () => {
  const [loading, setLoading] = useState(false);
  const { messages, setMessage, selectedConversation } = useConversation();
  const conversationIdRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation || !selectedConversation._id) {
        // Only clear messages if conversation is actually being unselected
        if (conversationIdRef.current !== null) {
          setMessage([]);
          conversationIdRef.current = null;
        }
        return;
      }
      
      const currentConversationId = selectedConversation._id;
      
      // Only fetch if conversation actually changed (not on initial mount with same conversation)
      if (conversationIdRef.current === currentConversationId && !isInitialMount.current) {
        return;
      }
      
      // Update ref before async operation
      conversationIdRef.current = currentConversationId;
      isInitialMount.current = false;
      
      // Check if we already have messages for this conversation
      const currentMessages = useConversation.getState().messages;
      const hasMessages = Array.isArray(currentMessages) && currentMessages.length > 0;
      
      // Only show loading if we don't have any messages yet (initial load)
      if (!hasMessages) {
        setLoading(true);
      }
      
      try {
        const token = getToken();
        const res = await axios.get(
          getApiUrl(`/api/message/get/${currentConversationId}`),
          {
            withCredentials: true,
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            }
          }
        );
        // Only update if still on same conversation
        if (conversationIdRef.current === currentConversationId) {
          setMessage(res.data || []);
        }
      } catch (error) {
        console.log("Error in getting messages", error);
        // Only clear if still on same conversation
        if (conversationIdRef.current === currentConversationId) {
          setMessage([]);
        }
      } finally {
        // Only update loading if still on same conversation
        if (conversationIdRef.current === currentConversationId) {
          setLoading(false);
        }
      }
    };
    getMessages();
  }, [selectedConversation?._id]);
  
  return { loading, messages };
};

export default useGetMessage;
