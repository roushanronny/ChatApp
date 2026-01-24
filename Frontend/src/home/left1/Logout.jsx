import React, { useState } from "react";
import { TbLogout2 } from "react-icons/tb";
import { FaComments, FaPhone, FaCircle, FaUsers, FaStar, FaCog } from "react-icons/fa";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useView } from "../../context/ViewContext.jsx";
import { getApiUrl } from "../../config/api.js";
import { getToken } from "../../utils/getToken.js";

function Logout() {
  const [loading, setLoading] = useState(false);
  const { activeView, setActiveView } = useView();
  
  const handleLogout = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(
        getApiUrl("/api/user/logout"), 
        {}, 
        {
          withCredentials: true,
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          }
        }
      );
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      setLoading(false);
      toast.success("Logged out successfully");
      window.location.reload();
    } catch (error) {
      console.log("Error in Logout", error);
      // Even if API call fails, clear local data and redirect
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      toast.success("Logged out successfully");
      window.location.reload();
    }
  };
  
  const handleNavClick = (view) => {
    setActiveView(view);
  };
  
  return (
    <div className="w-16 bg-brown-light text-brown-text flex flex-col items-center py-2 border-r border-brown-medium">
      <div className="flex flex-col items-center space-y-4 flex-1">
        <button
          onClick={() => handleNavClick("chats")}
          className={`p-3 rounded-lg transition ${
            activeView === "chats" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Chats"
        >
          <FaComments className={`text-2xl ${activeView === "chats" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
        <button
          onClick={() => handleNavClick("calls")}
          className={`p-3 rounded-lg transition ${
            activeView === "calls" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Calls"
        >
          <FaPhone className={`text-xl ${activeView === "calls" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
        <button
          onClick={() => handleNavClick("status")}
          className={`p-3 rounded-lg transition ${
            activeView === "status" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Status"
        >
          <FaCircle className={`text-xl ${activeView === "status" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
        <button
          onClick={() => handleNavClick("communities")}
          className={`p-3 rounded-lg transition ${
            activeView === "communities" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Communities"
        >
          <FaUsers className={`text-xl ${activeView === "communities" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
        <button
          onClick={() => handleNavClick("starred")}
          className={`p-3 rounded-lg transition ${
            activeView === "starred" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Starred Messages"
        >
          <FaStar className={`text-xl ${activeView === "starred" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
      </div>
      <div className="flex flex-col items-center space-y-4 pb-2">
        <button
          onClick={() => handleNavClick("settings")}
          className={`p-3 rounded-lg transition ${
            activeView === "settings" ? "bg-brown-medium" : "hover:bg-brown-primary/20"
          }`}
          title="Settings"
        >
          <FaCog className={`text-xl ${activeView === "settings" ? "text-brown-primary" : "text-brown-dark"}`} />
        </button>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="p-3 rounded-lg hover:bg-brown-primary/20 transition disabled:opacity-50"
          title="Logout"
        >
          <TbLogout2 className="text-xl text-brown-dark" />
        </button>
      </div>
    </div>
  );
}
export default Logout;