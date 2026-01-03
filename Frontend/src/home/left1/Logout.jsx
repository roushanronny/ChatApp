import React, { useState } from "react";
import { TbLogout2 } from "react-icons/tb";
import { FaComments, FaPhone, FaCircle, FaUsers, FaStar, FaCog } from "react-icons/fa";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useView } from "../../context/ViewContext.jsx";
import { getApiUrl } from "../../config/api.js";

function Logout() {
  const [loading, setLoading] = useState(false);
  const { activeView, setActiveView } = useView();
  
  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await axios.post(getApiUrl("/api/user/logout"), {}, {
        withCredentials: true,
      });
      localStorage.removeItem("ChatApp");
      Cookies.remove("jwt");
      setLoading(false);
      toast.success("Logged out successfully");
      window.location.reload();
    } catch (error) {
      console.log("Error in Logout", error);
      toast.error("Error in logging out");
    }
  };
  
  const handleNavClick = (view) => {
    setActiveView(view);
  };
  
  return (
    <div className="w-16 bg-[#0B141A] text-white flex flex-col items-center py-2 border-r border-[#313D45]">
      <div className="flex flex-col items-center space-y-4 flex-1">
        <button
          onClick={() => handleNavClick("chats")}
          className={`p-3 rounded-lg transition ${
            activeView === "chats" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Chats"
        >
          <FaComments className={`text-2xl ${activeView === "chats" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
        <button
          onClick={() => handleNavClick("calls")}
          className={`p-3 rounded-lg transition ${
            activeView === "calls" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Calls"
        >
          <FaPhone className={`text-xl ${activeView === "calls" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
        <button
          onClick={() => handleNavClick("status")}
          className={`p-3 rounded-lg transition ${
            activeView === "status" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Status"
        >
          <FaCircle className={`text-xl ${activeView === "status" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
        <button
          onClick={() => handleNavClick("communities")}
          className={`p-3 rounded-lg transition ${
            activeView === "communities" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Communities"
        >
          <FaUsers className={`text-xl ${activeView === "communities" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
        <button
          onClick={() => handleNavClick("starred")}
          className={`p-3 rounded-lg transition ${
            activeView === "starred" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Starred Messages"
        >
          <FaStar className={`text-xl ${activeView === "starred" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
      </div>
      <div className="flex flex-col items-center space-y-4 pb-2">
        <button
          onClick={() => handleNavClick("settings")}
          className={`p-3 rounded-lg transition ${
            activeView === "settings" ? "bg-[#313D45]" : "hover:bg-[#202C33]"
          }`}
          title="Settings"
        >
          <FaCog className={`text-xl ${activeView === "settings" ? "text-[#00A884]" : "text-[#8696A0]"}`} />
        </button>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="p-3 rounded-lg hover:bg-[#202C33] transition disabled:opacity-50"
          title="Logout"
        >
          <TbLogout2 className="text-xl text-[#8696A0]" />
        </button>
      </div>
    </div>
  );
}
export default Logout;