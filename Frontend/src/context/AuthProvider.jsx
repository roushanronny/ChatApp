import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  // Initialize state properly - only get from localStorage (which should be JSON)
  const getInitialUserState = () => {
    try {
      const stored = localStorage.getItem("ChatApp");
      if (stored) {
        // Check if it's valid JSON
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (error) {
      console.error("Error parsing ChatApp from localStorage:", error);
      // Clear invalid data
      localStorage.removeItem("ChatApp");
    }
    return undefined;
  };

  const [authUser, setAuthUser] = useState(getInitialUserState);

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newState = getInitialUserState();
      setAuthUser(newState);
    };

    // Listen for storage events (when localStorage changes in other tabs)
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={[authUser, setAuthUser]}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
