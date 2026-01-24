import Cookies from "js-cookie";

/**
 * Get JWT token from cookies or localStorage
 * @returns {string|null} JWT token or null if not found
 */
export const getToken = () => {
  // First try to get from cookies
  let token = Cookies.get("jwt");
  
  if (token) {
    return token;
  }
  
  // If not in cookies, try localStorage
  try {
    const stored = localStorage.getItem("ChatApp");
    if (stored) {
      const data = JSON.parse(stored);
      // Token might be directly in data or in data.token
      token = data.token || (typeof data === "string" ? data : null);
      if (token) {
        // Also save to cookie for future use
        Cookies.set("jwt", token, { expires: 10 });
        return token;
      }
    }
  } catch (e) {
    console.error("Error getting token from localStorage:", e);
  }
  
  return null;
};





