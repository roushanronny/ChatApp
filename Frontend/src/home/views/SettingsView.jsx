import React from "react";
import { useAuth } from "../../context/AuthProvider.jsx";

function SettingsView() {
  const [authUser] = useAuth();
  
  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen overflow-y-auto">
      <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
        <h1 className="font-semibold text-lg text-white">Settings</h1>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#313D45]">
                <img 
                  src={authUser?.user?.profilePicture || ""} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-medium">{authUser?.user?.fullname || "Your Name"}</p>
                <p className="text-[#8696A0] text-sm">About: Hey there! I am using WhatsApp</p>
              </div>
            </div>
            <button className="text-[#00A884] text-sm">Edit Profile</button>
          </div>
        </div>
        
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Account</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Privacy
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Security
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Two-Step Verification
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Change Number
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Delete Account
            </button>
          </div>
        </div>
        
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Chats</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Chat Wallpaper
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Font Size
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Archive All Chats
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Clear All Chats
            </button>
          </div>
        </div>
        
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Notifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Message Notifications
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Sound
            </button>
          </div>
        </div>
        
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Storage and Data</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Storage Usage
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Network Usage
            </button>
          </div>
        </div>
        
        <div className="bg-[#202C33] rounded-lg p-4">
          <h2 className="text-white text-base font-medium mb-4">Help</h2>
          <div className="space-y-3">
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Help Center
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Contact Us
            </button>
            <button className="w-full text-left text-[#8696A0] hover:text-white py-2">
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;

