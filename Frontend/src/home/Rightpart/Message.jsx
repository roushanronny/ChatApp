import React, { useState, useRef, useEffect } from "react";
import { FaCheck, FaCheckDouble, FaStar, FaFile } from "react-icons/fa";
import MessageContextMenu from "../../components/MessageContextMenu";
import ReactPicker from "../../components/ReactPicker";
import ForwardModal from "../../components/ForwardModal";
import axios from "axios";
import Cookies from "js-cookie";
import useConversation from "../../statemanage/useConversation";
import { getToken } from "../../utils/getToken.js";
import toast from "react-hot-toast";
import { getApiUrl } from "../../config/api.js";

function Message({ message }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [reactPosition, setReactPosition] = useState({ x: 0, y: 0 });
  const [reactMessage, setReactMessage] = useState(null);
  const messageRef = useRef(null);
  const { setMessage: setMessages, messages } = useConversation();

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
  const userId = authUser?.user?._id;

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside context menu or react picker
      if (e.target.closest('.context-menu') || e.target.closest('.react-picker')) {
        return;
      }
      setShowContextMenu(false);
      setShowReactPicker(false);
    };
    if (showContextMenu || showReactPicker) {
      // Use setTimeout to avoid immediate closing
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("contextmenu", handleClickOutside);
      }, 100);
      return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("contextmenu", handleClickOutside);
      };
    }
  }, [showContextMenu, showReactPicker]);

  const handleRightClick = (e) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleMessageAction = async (action, msg) => {
    console.log("handleMessageAction called:", action, "msg:", msg?._id, "message prop:", message?._id);
    
    // Use msg if provided, otherwise fallback to message prop
    const targetMessage = msg || message;
    
    if (!targetMessage) {
      console.error("No message provided to handleMessageAction - msg:", msg, "message:", message);
      return;
    }
    
    if (!targetMessage._id) {
      console.error("Message _id is missing:", targetMessage);
      return;
    }
    
    console.log("Target message for action:", targetMessage._id, "Action:", action);
    
    setShowContextMenu(false);
    
    try {
      switch(action) {
        case "reply":
          // Set reply message in context to show in input field
          window.dispatchEvent(new CustomEvent('setReplyMessage', { detail: targetMessage }));
          break;
        case "react":
          // Set react picker position before opening
          const reactX = menuPosition.x;
          const reactY = menuPosition.y - 100;
          setReactPosition({ x: reactX, y: reactY });
          // Store message for react picker
          setReactMessage(targetMessage);
          // Small delay to ensure context menu closes before opening react picker
          setTimeout(() => {
            setShowReactPicker(true);
          }, 150);
          break;
        case "forward":
          setShowForwardModal(true);
          break;
        case "star":
          console.log("Calling handleStar for message:", targetMessage._id);
          await handleStar(targetMessage);
          break;
        case "delete":
          console.log("Calling handleDelete for message:", targetMessage._id);
          await handleDelete(targetMessage);
          break;
        default:
          console.log("Unknown action:", action);
          break;
      }
    } catch (error) {
      console.error("Error in handleMessageAction:", error);
    }
  };

  const handleStar = async (msg) => {
    console.log("⭐⭐⭐ handleStar called for message:", msg?._id);
    if (!msg || !msg._id) {
      console.error("Invalid message in handleStar:", msg);
      return;
    }
    
    try {
      const token = getToken();
      
      if (!token) {
        console.error("❌ No token found in cookies or localStorage");
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }
      
      console.log("🌐 Calling star API for message:", msg._id);
      const response = await axios.put(
        getApiUrl(`/api/message/star/${msg._id}`),
        {},
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("✅ Star API response:", response.data);
      
      // Update local message without triggering reload - use functional update
      setMessages(prevMessages => {
        if (!prevMessages || !Array.isArray(prevMessages)) {
          console.log("⚠️ prevMessages is not valid array:", prevMessages);
          return prevMessages || [];
        }
        const updated = prevMessages.map(m => {
          if (m._id === msg._id) {
            console.log("🔄 Updating message:", m._id, "isStarred:", response.data.isStarred);
            return { ...m, isStarred: response.data.isStarred };
          }
          return m;
        });
        console.log("✅ Updated messages count:", updated.length);
        return updated;
      });
    } catch (error) {
      console.error("❌ Error starring message:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error message:", error.message);
      // Don't show alert, just log the error
    }
  };

  const handleDelete = async (msg) => {
    console.log("🗑️🗑️🗑️ handleDelete called for message:", msg?._id);
    if (!msg || !msg._id) {
      console.error("Invalid message in handleDelete:", msg);
      return;
    }
    
    try {
      const token = getToken();
      
      if (!token) {
        console.error("❌ No token found in cookies or localStorage");
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }
      
      console.log("🌐 Calling delete API for message:", msg._id);
      const response = await axios.delete(
        getApiUrl(`/api/message/delete/${msg._id}`),
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("✅ Delete API response:", response.data);
      
      // Remove from local messages without triggering reload - use functional update
      setMessages(prevMessages => {
        if (!prevMessages || !Array.isArray(prevMessages)) {
          console.log("⚠️ prevMessages is not valid array:", prevMessages);
          return prevMessages || [];
        }
        const filtered = prevMessages.filter(m => {
          const shouldKeep = m._id !== msg._id;
          if (!shouldKeep) {
            console.log("🗑️ Removing message:", m._id);
          }
          return shouldKeep;
        });
        console.log("✅ Messages after delete:", filtered.length, "removed 1, total was:", prevMessages.length);
        return filtered;
      });
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error message:", error.message);
      // Don't show alert, just log the error
    }
  };

  const handleReact = async (emoji) => {
    const targetMsg = reactMessage || message;
    console.log("😊😊😊 handleReact called with emoji:", emoji, "for message:", targetMsg?._id);
    
    if (!targetMsg || !targetMsg._id) {
      console.error("Invalid message in handleReact:", targetMsg);
      return;
    }
    
    setShowReactPicker(false);
    setReactMessage(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        console.error("❌ No token found in cookies or localStorage");
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }
      
      console.log("🌐 Calling react API for message:", targetMsg._id, "with emoji:", emoji);
      const response = await axios.put(
        getApiUrl(`/api/message/react/${targetMsg._id}`),
        { emoji },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("✅ React API response:", response.data);
      
      // Update local message without triggering reload - use functional update
      setMessages(prevMessages => {
        if (!prevMessages || !Array.isArray(prevMessages)) {
          console.log("⚠️ prevMessages is not valid array:", prevMessages);
          return prevMessages || [];
        }
        const updated = prevMessages.map(m => {
          if (m._id === targetMsg._id) {
            console.log("🔄 Updating message reactions:", m._id, "reactions:", response.data.reactions);
            return { ...m, reactions: response.data.reactions };
          }
          return m;
        });
        console.log("✅ Updated messages count:", updated.length);
        return updated;
      });
    } catch (error) {
      console.error("❌ Error reacting to message:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error message:", error.message);
      // Don't show alert, just log the error
    }
  };

  const handleForward = async (receiverIds) => {
    try {
      const token = Cookies.get("jwt");
      await axios.post(
        getApiUrl(`/api/message/forward/${message._id}`),
        { receiverIds },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setShowForwardModal(false);
    } catch (error) {
      console.error("Error forwarding message:", error);
    }
  };

  const getMyReaction = () => {
    if (!message.reactions || !userId) return null;
    return message.reactions.find(r => r.userId?._id === userId || r.userId === userId);
  };

  const myReaction = getMyReaction();

  const createdAt = new Date(message.createdAt);
  const formattedTime = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    const replyMsg = message.replyTo;
    const isReplyFromMe = replyMsg.senderId?._id === userId || replyMsg.senderId === userId;
    
    return (
      <div className={`mb-1 pb-1 border-l-2 ${isReplyFromMe ? 'border-[#53BDEB]' : 'border-[#8696A0]'} pl-2`}>
        <div className="text-[#667781] text-xs font-medium">
          {isReplyFromMe ? "You" : (message.senderId?.fullname || message.senderId || "Unknown")}
        </div>
        <div className="text-[#667781] text-xs truncate">
          {replyMsg.messageType === "image" ? "📷 Image" : 
           replyMsg.messageType === "video" ? "🎥 Video" :
           replyMsg.messageType === "audio" ? "🎤 Audio" :
           replyMsg.message || "Message"}
        </div>
      </div>
    );
  };

  const renderMessageContent = () => {
    if (message.messageType === "image") {
      const imageUrl = message.mediaUrl || message.content || "";
      if (!imageUrl) return <p className="text-[#111B21]">Image not available</p>;
      
      const handleImageClick = () => {
        // For base64 images, create a new window with the image
        if (imageUrl.startsWith('data:')) {
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head><title>Image</title></head>
                <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;">
                  <img src="${imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                </body>
              </html>
            `);
          }
        } else {
          window.open(imageUrl, '_blank');
        }
      };
      
      return (
        <div>
          {renderReplyPreview()}
          <img 
            src={imageUrl} 
            alt="Sent" 
            className="max-w-xs rounded-lg mb-1 cursor-pointer hover:opacity-90 transition"
            onClick={handleImageClick}
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
          {renderReplyPreview()}
          <video 
            src={videoUrl} 
            controls 
            className="max-w-xs rounded-lg mb-1"
            preload="metadata"
            onError={(e) => {
              console.error("Error loading video:", e);
              e.target.style.display = 'none';
              const errorDiv = document.createElement('div');
              errorDiv.className = 'text-[#111B21] p-2';
              errorDiv.textContent = 'Video failed to load';
              e.target.parentNode.appendChild(errorDiv);
            }}
            onLoadStart={() => {
              console.log("Video loading started");
            }}
            onLoadedData={() => {
              console.log("Video loaded successfully");
            }}
          />
          {message.message && (
            <p className="mt-1 text-[#111B21]">{message.message}</p>
          )}
        </div>
      );
    }
    
    if (message.messageType === "audio") {
      const audioUrl = message.mediaUrl || message.content || "";
      if (!audioUrl) return <p className="text-[#111B21]">Audio not available</p>;
      
      return (
        <div>
          {renderReplyPreview()}
          <div className="flex items-center space-x-2 bg-[#F0F2F5] px-3 py-2 rounded-lg mb-1">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#667781">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            <audio 
              src={audioUrl} 
              controls 
              className="flex-1"
              style={{ maxWidth: '200px', height: '32px' }}
              onError={(e) => {
                console.error("Error loading audio:", e);
              }}
            />
          </div>
          {message.message && (
            <p className="mt-1 text-[#111B21]">{message.message}</p>
          )}
        </div>
      );
    }
    
    if (message.messageType === "file") {
      const fileUrl = message.mediaUrl || message.content || "";
      const fileName = message.message || "File";
      
      const handleFileClick = () => {
        if (!fileUrl) {
          toast.error("File URL not available");
          return;
        }
        
        // For base64 files, create download
        if (fileUrl.startsWith('data:')) {
          try {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName || 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (error) {
            console.error("Error downloading file:", error);
            toast.error("Error downloading file");
          }
        } else {
          // For URL files, open in new tab or download
          window.open(fileUrl, '_blank');
        }
      };
      
      return (
        <div>
          {renderReplyPreview()}
          <div 
            className="flex items-center space-x-3 bg-[#F0F2F5] px-3 py-2 rounded-lg mb-1 cursor-pointer hover:bg-[#E4E6EB] transition"
            onClick={handleFileClick}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#667781">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[#111B21] text-sm font-medium truncate">{fileName}</p>
              <p className="text-[#00A884] text-xs">Click to download</p>
            </div>
          </div>
        </div>
      );
    }
    
    // For text messages, check both message and content fields
    const textContent = message.message || message.content || "";
    return (
      <div>
        {renderReplyPreview()}
        <p className="text-[#111B21]">{textContent}</p>
      </div>
    );
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
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <div className="flex items-center gap-1">
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <span 
                      key={idx}
                      className="bg-[#F0F2F5] px-1.5 py-0.5 rounded-full text-[10px]"
                      title={reaction.userId?.fullname || "User"}
                    >
                      {reaction.emoji} {reaction.userId?._id === userId || reaction.userId === userId ? "You" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {message.isStarred && (
                <FaStar className="text-[#FFC107] text-[10px]" title="Starred" />
              )}
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
      </div>

      {showContextMenu && (
        <MessageContextMenu
          message={message}
          position={menuPosition}
          onClose={() => setShowContextMenu(false)}
          onAction={handleMessageAction}
        />
      )}

      {showReactPicker && (
        <ReactPicker
          position={reactPosition}
          onClose={() => setShowReactPicker(false)}
          onSelect={handleReact}
          currentReaction={myReaction?.emoji}
        />
      )}

      {showForwardModal && (
        <ForwardModal
          isOpen={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          onForward={handleForward}
          message={message}
        />
      )}
    </>
  );
}

export default Message;
