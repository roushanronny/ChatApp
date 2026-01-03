import User from "../models/user.model.js"; // Adjust the path if necessary
import bcrypt from "bcryptjs";
import createTokenAndSaveCookie from "../jwt/generateToken.js";

// Signup controller
export const signup = async (req, res) => {
    const { fullname, email, password, confirmPassword } = req.body;
    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: "User already registered" });
        }
        // Hashing the password
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = await new User({
            fullname,
            email,
            password: hashPassword,
        });
        await newUser.save();
        if (newUser) {
            const token = createTokenAndSaveCookie(newUser._id, res);
            res.status(201).json({
                message: "User created successfully",
                token: token, // Send token in response
                user: {
                    _id: newUser._id,
                    fullname: newUser.fullname,
                    email: newUser.email,
                },
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Login controller
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!user || !isMatch) {
            return res.status(400).json({ error: "Invalid user credential" });
        }
        const token = createTokenAndSaveCookie(user._id, res);
        res.status(201).json({
            message: "User logged in successfully",
            token: token, // Send token in response
            user: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Logout controller
export const logout = async (req, res) => {
    try {
        res.clearCookie("jwt");
        res.status(201).json({ message: "User logged out successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// All Users controller
export const getUserProfile = async (req, res) => {
 try {
    const loggedInUser = req.user._id;
    const filiteredUsers = await User.find({_id:{$ne: loggedInUser}}).select("-password");
    res. status (201).json({ filiteredUsers });
 }  catch (error) {
    console. log("Error in allUsers Controller: " + error); 
    res.status (500).json({ message: "Server error" });
 }
};

// Update Profile Picture controller
export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profilePicture } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({
      message: "Profile picture updated successfully",
      user,
    });
  } catch (error) {
    console.log("Error in updateProfilePicture: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update Bio controller
export const updateBio = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bio } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { bio: bio || "Hey there! I am using WhatsApp" },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({
      message: "Bio updated successfully",
      user,
    });
  } catch (error) {
    console.log("Error in updateBio: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Block user
export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.body;
    
    if (!blockedUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    if (userId.toString() === blockedUserId.toString()) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }
    
    // Add to blockedUsers array of current user
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedUsers: blockedUserId } },
      { new: true }
    ).select("-password");
    
    // Add to blockedBy array of blocked user
    await User.findByIdAndUpdate(
      blockedUserId,
      { $addToSet: { blockedBy: userId } }
    );
    
    res.status(200).json({
      message: "User blocked successfully",
      user,
    });
  } catch (error) {
    console.log("Error in blockUser: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unblock user
export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.body;
    
    if (!blockedUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Remove from blockedUsers array of current user
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedUsers: blockedUserId } },
      { new: true }
    ).select("-password");
    
    // Remove from blockedBy array of unblocked user
    await User.findByIdAndUpdate(
      blockedUserId,
      { $pull: { blockedBy: userId } }
    );
    
    res.status(200).json({
      message: "User unblocked successfully",
      user,
    });
  } catch (error) {
    console.log("Error in unblockUser: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .populate("blockedUsers", "fullname profilePicture email")
      .select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({
      blockedUsers: user.blockedUsers || [],
    });
  } catch (error) {
    console.log("Error in getBlockedUsers: " + error);
    res.status(500).json({ error: "Internal server error" });
  }
}; 

/* export const allUsers = async (req, res) => {
    try {
        console.log(req);
        const loggedInUser = req.user._id;
        const filteredUsers = await User.find({
            _id: { $ne: loggedInUser },
        }).select("-password");
        res.status(201).json(filteredUsers);
    } catch (error) {
        console.log("Error in allUsers Controller: " + error);
    }
}; */
