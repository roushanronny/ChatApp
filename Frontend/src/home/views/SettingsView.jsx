import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider.jsx";
import axios from "../../config/axios.js";
import { getApiUrl } from "../../config/api.js";
import { getToken } from "../../utils/getToken.js";
import toast from "react-hot-toast";
import ContactInfoModal from "../../components/ContactInfoModal.jsx";

function SettingsView() {
  const [authUser, setAuthUser] = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  useEffect(() => {
    fetchBlockedUsers();
  }, []);
  
  const fetchBlockedUsers = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await axios.get(
        getApiUrl("/api/user/blocked"),
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      setBlockedUsers(response.data.blockedUsers || []);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  };
  
  const handleUnblock = async (userId) => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        toast.error("Please login again");
        return;
      }
      
      await axios.post(
        getApiUrl("/api/user/unblock"),
        { blockedUserId: userId },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Remove from list
      setBlockedUsers(blockedUsers.filter(u => u._id !== userId));
      toast.success("User unblocked successfully");
      
      // Reload to update UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Failed to unblock user");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full bg-brown-bg text-brown-text flex flex-col h-screen overflow-y-auto">
      <div className="bg-brown-primary px-4 py-3 border-b border-brown-medium">
        <h1 className="font-semibold text-lg text-white">Settings</h1>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-full overflow-hidden bg-brown-light cursor-pointer relative group"
                onClick={() => setShowProfileModal(true)}
              >
                <img 
                  src={authUser?.user?.profilePicture || ""} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Change
                  </span>
                </div>
              </div>
              <div>
                <p className="text-brown-text font-medium">{authUser?.user?.fullname || "Your Name"}</p>
                <p className="text-brown-dark text-sm">About: {authUser?.user?.bio || "Hey there! I am using Chatmate"}</p>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-brown-primary text-sm hover:underline mt-1"
                >
                  Change Profile Picture
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Blocked</h2>
          {blockedUsers.length > 0 ? (
            <div className="space-y-2">
              {blockedUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between py-2 border-b border-brown-light last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-brown-light">
                      <img 
                        src={user.profilePicture || ""} 
                        alt={user.fullname}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-brown-text text-sm font-medium">{user.fullname}</p>
                      <p className="text-brown-dark text-xs">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user._id)}
                    disabled={loading}
                    className="text-brown-primary text-sm hover:underline disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brown-dark text-sm py-2">No blocked users</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Account</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Privacy
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Security
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Two-Step Verification
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Change Number
            </button>
            <button className="w-full text-left text-red-600 hover:text-red-700 py-2">
              Delete Account
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Chats</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Chat Wallpaper
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Font Size
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Archive All Chats
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Clear All Chats
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Notifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Message Notifications
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Sound
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Storage and Data</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Storage Usage
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Network Usage
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-brown-light">
          <h2 className="text-brown-text text-base font-medium mb-4">Help</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Help Center
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Contact Us
            </button>
            <button className="w-full text-left text-brown-dark hover:text-brown-text py-2">
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
      
      {/* Profile Edit Modal */}
      {showProfileModal && authUser?.user && (
        <ContactInfoModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          contact={authUser.user} // Pass current user as contact
        />
      )}
    </div>
  );
}

export default SettingsView;
