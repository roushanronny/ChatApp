import React, { useEffect } from "react";
import { useSocketContext } from "./SocketContext";
import useConversation from "../statemanage/useConversation.js";
import sound from "../assets/notification.mp3";
const useGetSocketMessage = () => {
  const { socket } = useSocketContext();
  const { messages, setMessage } = useConversation();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // Only play notification if message is from someone else
      const currentUser = JSON.parse(localStorage.getItem("ChatApp"))?.user;
      if (newMessage.senderId?._id !== currentUser?._id && newMessage.senderId !== currentUser?._id) {
        const notification = new Audio(sound);
        notification.play();
      }
      
      // Check if message already exists to avoid duplicates
      setMessage(prevMessages => {
        const exists = prevMessages.some(msg => msg._id === newMessage._id);
        if (exists) return prevMessages;
        return [...prevMessages, newMessage];
      });
    };

    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessage(prevMessages => prevMessages.map(m => 
        m._id === messageId ? { ...m, reactions } : m
      ));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessage(prevMessages => prevMessages.filter(m => m._id !== messageId));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageReaction", handleMessageReaction);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageReaction", handleMessageReaction);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, setMessage]);
};
export default useGetSocketMessage;
