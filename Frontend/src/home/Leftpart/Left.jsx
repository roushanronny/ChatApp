import React, { useState } from "react";
import Search from "./Search";
import Users from "./Users";
import { useView } from "../../context/ViewContext";
import { FaBox } from "react-icons/fa";

function Left() {
  const [activeTab, setActiveTab] = useState("all");
  const { setActiveView } = useView();
  
  return (
    <div className="w-[30%] bg-[#111B21] text-gray-300 flex flex-col h-screen border-r border-[#313D45] overflow-hidden">
      <div className="bg-[#202C33] px-4 py-3">
        <h1 className="font-semibold text-lg text-white">Chats</h1>
      </div>
      <Search />
      <div className="bg-[#202C33] px-4 py-1 flex space-x-1 border-b border-[#313D45]">
        <button 
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "all" 
              ? "text-[#00A884] border-b-2 border-[#00A884]" 
              : "text-[#8696A0] hover:text-white"
          }`}
        >
          All
        </button>
        <button 
          onClick={() => setActiveTab("unread")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "unread" 
              ? "text-[#00A884] border-b-2 border-[#00A884]" 
              : "text-[#8696A0] hover:text-white"
          }`}
        >
          Unread
        </button>
        <button 
          onClick={() => setActiveTab("favourites")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "favourites" 
              ? "text-[#00A884] border-b-2 border-[#00A884]" 
              : "text-[#8696A0] hover:text-white"
          }`}
        >
          Favourites
        </button>
        <button 
          onClick={() => setActiveTab("groups")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "groups" 
              ? "text-[#00A884] border-b-2 border-[#00A884]" 
              : "text-[#8696A0] hover:text-white"
          }`}
        >
          Groups
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Users activeTab={activeTab} />
      </div>
      {/* Archived Button */}
      <div className="px-4 py-2 border-t border-[#313D45]">
        <button
          onClick={() => setActiveView("archived")}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-[#2A3942] rounded-lg transition text-[#00A884]"
        >
          <FaBox className="text-lg" />
          <span className="text-sm font-medium">Archived</span>
        </button>
      </div>
    </div>
  );
}

export default Left;
