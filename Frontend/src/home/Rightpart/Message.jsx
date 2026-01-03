import React, { useState, useRef, useEffect } from "react";
import { FaCheck, FaCheckDouble } from "react-icons/fa";
import MessageContextMenu from "../../components/MessageContextMenu";
import toast from "react-hot-toast";

function Message({ message }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef(null);

  let authUser = null;
  try {
    const stored = localStorage.getItem("ChatApp");
    if (stored) {
      authUser = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error parsing ChatApp from localStorage:", error);
  }
  
  const itsMe = authUser?.user?._id === message?.senderId;

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };
    if (showContextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu]);

  const handleRightClick = (e) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleMessageAction = (action, msg) => {
    switch(action) {
      case "reply":
        toast.info("Reply feature coming soon!");
        break;
      case "react":
        toast.info("React feature coming soon!");
        break;
      case "forward":
        toast.info("Forward feature coming soon!");
        break;
      case "star":
        toast.info("Star feature coming soon!");
        break;
      case "delete":
        toast.info("Delete feature coming soon!");
        break;
      default:
        break;
    }
  };

  const createdAt = new Date(message.createdAt);
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderMessageContent = () => {
    if (message.messageType === "image") {
      const imageUrl = message.mediaUrl || message.content || "";
      if (!imageUrl) return <p className="text-[#111B21]">Image not available</p>;
      
      return (
        <div>
          <img 
            src={imageUrl} 
            alt="Sent" 
            className="max-w-xs rounded-lg mb-1 cursor-pointer"
            onClick={() => window.open(imageUrl, '_blank')}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em">Image failed to load</text></svg>';
            }}
          />
          {message.message && (
            <p className="mt-1 text-[#111B21]">{message.message}</p>
          )}
        </div>
      );
    }
    
    if (message.messageType === "video") {
      const videoUrl = message.mediaUrl || message.content || "";
      if (!videoUrl) return <p className="text-[#111B21]">Video not available</p>;
      
      return (
        <div>
          <video 
            src={videoUrl} 
            controls 
            className="max-w-xs rounded-lg mb-1"
            onError={(e) => {
              console.error("Error loading video:", e);
            }}
          />
          {message.message && (
            <p className="mt-1 text-[#111B21]">{message.message}</p>
          )}
        </div>
      );
    }
    
    // For text messages, check both message and content fields
    const textContent = message.message || message.content || "";
    return <p className="text-[#111B21]">{textContent}</p>;
  };

  return (
    <>
      <div className={`flex ${itsMe ? 'justify-end' : 'justify-start'} mb-0.5 px-1`}>
        <div className={`flex flex-col max-w-[65%] ${itsMe ? 'items-end' : 'items-start'}`}>
          <div
            ref={messageRef}
            onContextMenu={handleRightClick}
            className={`px-2 py-1.5 shadow-sm cursor-pointer ${
              itsMe
                ? 'bg-[#DCF8C6] rounded-lg rounded-tr-sm'
                : 'bg-white rounded-lg rounded-tl-sm'
            }`}
            style={{
              boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
            }}
          >
          {renderMessageContent()}
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-[#667781] text-[11px] leading-tight">{formattedTime}</span>
            {itsMe && (
              <span className="flex items-center ml-1">
                {message.isSeen ? (
                  <FaCheckDouble className="text-[#53BDEB] text-[11px]" title="Seen" />
                ) : message.isDelivered ? (
                  <FaCheckDouble className="text-[#667781] text-[11px]" title="Delivered" />
                ) : (
                  <FaCheck className="text-[#667781] text-[11px]" title="Sent" />
                )}
              </span>
            )}
          </div>
          </div>
        </div>
      </div>

      {showContextMenu && (
        <MessageContextMenu
          message={message}
          position={menuPosition}
          onClose={() => setShowContextMenu(false)}
          onAction={handleMessageAction}
        />
      )}
    </>
  );
}

export default Message;
