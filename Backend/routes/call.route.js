import express from "express";
import { createCall, updateCallStatus, getCallHistory } from "../controller/call.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router();

router.post("/create", secureRoute, createCall);
router.put("/update/:callId", secureRoute, updateCallStatus);
router.get("/history", secureRoute, getCallHistory);

export default router;





