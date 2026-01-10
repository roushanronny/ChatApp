import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import useGetAllUsers from "../context/useGetAllUsers";

function ForwardModal({ isOpen, onClose, onForward, message }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allUsers, loading] = useGetAllUsers();
  const currentUser = JSON.parse(localStorage.getItem("ChatApp"))?.user;

  useEffect(() => {
    setSelectedUsers([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleForward = () => {
    if (selectedUsers.length === 0) {
      return;
    }
    onForward(selectedUsers);
  };

  const filteredUsers = Array.isArray(allUsers) 
    ? allUsers.filter(user => user._id !== currentUser?._id)
    : [];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#202C33] rounded-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#111B21] px-6 py-4 border-b border-[#313D45]">
          <h2 className="text-white text-xl font-semibold">Forward Message</h2>
          <p className="text-[#8696A0] text-sm mt-1">
            Select contacts to forward this message
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-[#8696A0] py-8">Loading contacts...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-[#8696A0] py-8">No contacts found</div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserToggle(user._id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    selectedUsers.includes(user._id)
                      ? "bg-[#2A3942]"
                      : "hover:bg-[#2A3942]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={user.profilePicture || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='20' fill='%23333'/><text x='50%25' y='50%25' font-size='16' fill='white' text-anchor='middle' dy='.3em'>${(user.fullname || user.name || 'U')[0].toUpperCase()}</text></svg>"}
                      alt={user.fullname || user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white text-sm font-medium">
                      {user.fullname || user.name}
                    </h3>
                  </div>
                  {selectedUsers.includes(user._id) && (
                    <div className="w-5 h-5 bg-[#00A884] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#313D45] px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2A3942] hover:bg-[#313D45] text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2 bg-[#00A884] hover:bg-[#00C895] text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Forward ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForwardModal;



