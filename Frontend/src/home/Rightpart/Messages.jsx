import React, { useEffect, useRef, useState, useMemo } from "react";
import Message from "./Message";
import useGetMessage from "../../context/useGetMessage.js";
import Loading from "../../components/Loading.jsx";
import useGetSocketMessage from "../../context/useGetSocketMessage.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import useConversation from "../../statemanage/useConversation.js";

function Messages({ searchQuery = "" }) {
  const { loading, messages } = useGetMessage();
  useGetSocketMessage(); // listing incoming messages
  const { socket } = useSocketContext();
  const { selectedConversation } = useConversation();
  const [isTyping, setIsTyping] = useState(false);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const searchLower = searchQuery.toLowerCase();
    return messages.filter(msg => {
      const messageText = (msg.message || msg.content || "").toLowerCase();
      return messageText.includes(searchLower);
    });
  }, [messages, searchQuery]);

  useEffect(() => {
    if (!socket || !selectedConversation) return;

    const handleTyping = ({ senderId }) => {
      if (senderId === selectedConversation._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === selectedConversation._id) {
        setIsTyping(false);
      }
    };

    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStopTyping);

    return () => {
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStopTyping);
    };
  }, [socket, selectedConversation]);

  const lastMsgRef = useRef();
  useEffect(() => {
    setTimeout(() => {
      if (lastMsgRef.current) {
        lastMsgRef.current.scrollIntoView({
          behavior: "smooth",
        });
      }
    }, 100);
  }, [filteredMessages, isTyping]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-2"
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='whatsapp-pattern' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23444547' stroke-width='0.5' opacity='0.08'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23whatsapp-pattern)'/%3E%3C/svg%3E")`,
        backgroundColor: '#0B141A',
      }}
    >
      {/* Encryption Banner */}
      <div className="flex items-center justify-center py-3 mb-2">
        <div className="bg-[#FEF9E7] px-4 py-2 rounded-full flex items-center space-x-2 cursor-pointer hover:bg-[#FEF3C7] transition">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#54656F">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <span className="text-[#54656F] text-xs font-medium">
            Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Click to learn more.
          </span>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loading />
        </div>
      ) : (
        <>
          {filteredMessages.length > 0 &&
            filteredMessages.map((message, index) => (
              <div key={message._id} ref={index === filteredMessages.length - 1 ? lastMsgRef : null}>
                <Message message={message} />
              </div>
            ))}
          
          {isTyping && selectedConversation && (
            <div className="flex justify-start mb-1 px-2">
              <div className="flex flex-col max-w-[65%] items-start">
                <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && filteredMessages.length === 0 && !isTyping && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-[#667781] text-lg">
              Say! Hi to start the conversation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
