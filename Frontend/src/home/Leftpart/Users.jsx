import React, { useMemo } from "react";
import User from "./User";
import useGetAllUsers from "../../context/useGetAllUsers";

function Users({ activeTab = "all" }) {
  const [allUsers, loading] = useGetAllUsers();
  
  // Ensure allUsers is always an array
  const usersArray = Array.isArray(allUsers) ? allUsers : [];
  
  // Filter users based on active tab
  const filteredUsers = useMemo(() => {
    if (activeTab === "all") {
      return usersArray;
    } else if (activeTab === "unread") {
      return usersArray.filter(user => user.unreadCount > 0);
    } else if (activeTab === "favourites") {
      // For now, return empty array as favourites feature needs backend support
      return [];
    } else if (activeTab === "groups") {
      // For now, return empty array as groups feature needs backend support
      return [];
    }
    return usersArray;
  }, [usersArray, activeTab]);
  
  if (loading) {
    return (
      <div className="px-8 py-2 text-white font-semibold">
        Loading users...
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-y-auto">
      {filteredUsers.length > 0 ? (
        filteredUsers.map((user, index) => (
          <User key={user._id || index} user={user} />
        ))
      ) : (
        <div className="px-4 py-8 text-center text-[#8696A0]">
          {activeTab === "favourites" 
            ? "No favourite chats" 
            : activeTab === "groups" 
            ? "No groups" 
            : activeTab === "unread"
            ? "No unread messages"
            : "No users found"}
        </div>
      )}
    </div>
  );
}

export default Users;
