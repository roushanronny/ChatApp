import jwt from "jsonwebtoken";

const createTokenAndSaveCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_TOKEN, {
    expiresIn: "10d",
  });
  res.cookie("jwt", token, {
    httpOnly: false, // Allow JS access for frontend
    secure: process.env.NODE_ENV === "production", // Only secure in production
    sameSite: "lax", // Allow cross-site requests
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  });
  return token; // Return token to send in response
};
export default createTokenAndSaveCookie;
