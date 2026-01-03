import express from "express";
import {
  signup,
  login,
  logout,
  getUserProfile,
  updateProfilePicture,
  updateBio
} from "../controller/user.controller.js";
import secureRoute from "../middleware/secureRoute.js";
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", secureRoute, logout);
router.get("/getUserProfile",secureRoute,getUserProfile);
router.put("/updateProfilePicture", secureRoute, updateProfilePicture);
router.put("/updateBio", secureRoute, updateBio);

export default router;

