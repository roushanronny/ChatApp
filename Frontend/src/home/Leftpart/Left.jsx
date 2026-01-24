import React, { useState } from "react";
import Search from "./Search";
import Users from "./Users";
import { useView } from "../../context/ViewContext";
import { FaBox } from "react-icons/fa";

function Left() {
  const [activeTab, setActiveTab] = useState("all");
  const { setActiveView } = useView();
  
  return (
    <div className="w-[30%] bg-brown-light text-brown-text flex flex-col h-screen border-r border-brown-medium overflow-hidden">
      <div className="bg-brown-primary px-4 py-3">
        <h1 className="font-semibold text-lg text-white">Chats</h1>
      </div>
      <Search />
      <div className="bg-white px-4 py-1 flex space-x-1 border-b border-brown-light">
        <button 
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "all" 
              ? "text-brown-primary border-b-2 border-brown-primary" 
              : "text-brown-dark hover:text-brown-text"
          }`}
        >
          All
        </button>
        <button 
          onClick={() => setActiveTab("unread")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "unread" 
              ? "text-brown-primary border-b-2 border-brown-primary" 
              : "text-brown-dark hover:text-brown-text"
          }`}
        >
          Unread
        </button>
        <button 
          onClick={() => setActiveTab("favourites")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "favourites" 
              ? "text-brown-primary border-b-2 border-brown-primary" 
              : "text-brown-dark hover:text-brown-text"
          }`}
        >
          Favourites
        </button>
        <button 
          onClick={() => setActiveTab("groups")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "groups" 
              ? "text-brown-primary border-b-2 border-brown-primary" 
              : "text-brown-dark hover:text-brown-text"
          }`}
        >
          Groups
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Users activeTab={activeTab} />
      </div>
      {/* Archived Button */}
      <div className="px-4 py-2 border-t border-brown-medium bg-white">
        <button
          onClick={() => setActiveView("archived")}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-brown-light rounded-lg transition text-brown-primary"
        >
          <FaBox className="text-lg" />
          <span className="text-sm font-medium">Archived</span>
        </button>
      </div>
    </div>
  );
}

export default Left;
