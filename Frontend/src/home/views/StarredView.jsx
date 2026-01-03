import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import useConversation from "../../statemanage/useConversation";

function StarredView() {
  const [starredMessages, setStarredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedConversation } = useConversation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStarredMessages();
  }, []);

  const fetchStarredMessages = async () => {
    try {
      const token = Cookies.get("jwt");
      const response = await axios.get("/api/message/starred", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStarredMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching starred messages:", error);
      setLoading(false);
    }
  };

  const handleMessageClick = (message) => {
    // Set the conversation based on message sender/receiver
    const currentUser = JSON.parse(localStorage.getItem("ChatApp"))?.user;
    const otherUser = message.senderId._id === currentUser?._id 
      ? message.receiverId 
      : message.senderId;
    
    setSelectedConversation(otherUser);
    navigate("/");
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  // Group messages by date
  const groupedMessages = starredMessages.reduce((acc, msg) => {
    const date = formatDate(msg.createdAt);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen">
      <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
        <h1 className="font-semibold text-lg text-white">Starred Messages</h1>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#8696A0]">Loading starred messages...</div>
        </div>
      ) : starredMessages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <svg viewBox="0 0 24 24" width="100" height="100" fill="#8696A0" opacity="0.4">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
            <h2 className="text-[#E9EDEF] text-xl font-light mb-2">No Starred Messages</h2>
            <p className="text-[#8696A0] text-sm">
              Messages you star will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date} className="px-4 py-2">
              <div className="text-[#8696A0] text-xs text-center mb-2">{date}</div>
              {messages.map((message) => (
                <div
                  key={message._id}
                  className="mb-4 p-3 bg-[#202C33] rounded-lg cursor-pointer hover:bg-[#2A3942] transition"
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={
                          message.senderId._id === JSON.parse(localStorage.getItem("ChatApp"))?.user?._id
                            ? message.receiverId?.profilePicture || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='20' fill='%23333'/><text x='50%25' y='50%25' font-size='16' fill='white' text-anchor='middle' dy='.3em'>${(message.receiverId?.fullname || 'U')[0].toUpperCase()}</text></svg>"
                            : message.senderId?.profilePicture || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='20' fill='%23333'/><text x='50%25' y='50%25' font-size='16' fill='white' text-anchor='middle' dy='.3em'>${(message.senderId?.fullname || 'U')[0].toUpperCase()}</text></svg>"
                        }
                        alt="Contact"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">
                        {message.senderId._id === JSON.parse(localStorage.getItem("ChatApp"))?.user?._id
                          ? message.receiverId?.fullname || "Unknown"
                          : message.senderId?.fullname || "Unknown"}
                      </div>
                      <div className="text-[#8696A0] text-xs">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="pl-[52px]">
                    <div className="bg-[#111B21] rounded-lg p-2">
                      {message.messageType === "image" && message.mediaUrl ? (
                        <img 
                          src={message.mediaUrl} 
                          alt="Starred" 
                          className="max-w-xs rounded-lg mb-1"
                        />
                      ) : message.messageType === "video" && message.mediaUrl ? (
                        <video 
                          src={message.mediaUrl} 
                          controls 
                          className="max-w-xs rounded-lg mb-1"
                        />
                      ) : (
                        <p className="text-white text-sm">{message.message || "Message"}</p>
                      )}
                      <div className="text-[#8696A0] text-xs mt-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StarredView;

