import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
function useGetAllUsers() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const getUsers = async () => {
      setLoading(true);
      try {
        const token = Cookies.get("jwt");
        const response = await axios.get("/api/user/getUserProfile", {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("API Response:", response.data);
        // Backend returns { filiteredUsers: [...] }
        const users = response.data.filiteredUsers || response.data.filteredUsers || [];
        console.log("Users array:", users);
        setAllUsers(users);
        setLoading(false);
      } catch (error) {
        console.log("Error in useGetAllUsers:", error);
        console.log("Error response:", error.response?.data);
        setAllUsers([]); // Set to empty array on error
        setLoading(false);
      }
    };
    getUsers();
  }, []);
  return [allUsers, loading];
}

export default useGetAllUsers;
