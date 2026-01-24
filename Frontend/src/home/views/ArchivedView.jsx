import React, { useState } from "react";
import useGetAllUsers from "../../context/useGetAllUsers";
import User from "../Leftpart/User";
import useConversation from "../../statemanage/useConversation";

function ArchivedView() {
  const [allUsers] = useGetAllUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedConversation } = useConversation();
  
  // Filter archived chats (for now, show empty as archived feature needs backend)
  const archivedChats = [];
  
  const filteredChats = archivedChats.filter(chat => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return chat.fullname?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="w-full bg-brown-bg text-brown-text flex h-screen">
      {/* Left Panel - Archived Chats List */}
      <div className="w-[30%] bg-brown-light flex flex-col border-r border-brown-medium">
        <div className="bg-brown-primary px-4 py-3 border-b border-brown-medium">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg text-white">Archived</h1>
            <button className="text-white hover:text-brown-light text-sm font-medium">
              Edit
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="bg-white px-4 py-2 border-b border-brown-light">
          <div className="flex items-center bg-brown-light rounded-lg px-3 py-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="brown-dark">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search archived chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-brown-text placeholder-brown-dark ml-3 flex-1 outline-none"
            />
          </div>
        </div>

        {/* Archived Chats List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat, index) => (
              <User key={chat._id || index} user={chat} />
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-brown-dark text-sm">
                {archivedChats.length === 0 
                  ? "Archived chats will appear here" 
                  : "No archived chats found"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Empty State */}
      <div className="flex-1 bg-brown-bg flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg viewBox="0 0 24 24" width="200" height="200" fill="brown-dark" opacity="0.4">
              <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/>
            </svg>
          </div>
          <h2 className="text-brown-text text-2xl font-light mb-2">Archived</h2>
          <p className="text-brown-dark text-sm max-w-md mx-auto leading-relaxed">
            Your archived chats will appear here.
            <br />
            Archive chats to hide them from your main chat list.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ArchivedView;




