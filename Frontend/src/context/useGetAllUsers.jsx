import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { getToken } from "../utils/getToken.js";
import { getApiUrl } from "../config/api.js";
function useGetAllUsers() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const getUsers = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          console.error("No token found");
          setAllUsers([]);
          setLoading(false);
          return;
        }
        const response = await axios.get(getApiUrl("/api/user/getUserProfile"), {
          withCredentials: true,
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
