import Call from "../models/call.model.js";

// Create or update call record
export const createCall = async (req, res) => {
  try {
    const { receiverId, callType, status } = req.body;
    const callerId = req.user._id;
    
    const call = new Call({
      callerId,
      receiverId,
      callType,
      status: status || "missed",
      startTime: new Date(),
    });
    
    await call.save();
    
    res.status(201).json({
      message: "Call recorded successfully",
      call,
    });
  } catch (error) {
    console.log("Error in createCall:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update call status (when answered/ended)
export const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, duration } = req.body;
    
    const call = await Call.findByIdAndUpdate(
      callId,
      {
        status,
        duration: duration || 0,
        endTime: new Date(),
      },
      { new: true }
    );
    
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }
    
    res.status(200).json({
      message: "Call updated successfully",
      call,
    });
  } catch (error) {
    console.log("Error in updateCallStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const calls = await Call.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .populate("callerId", "fullname profilePicture")
      .populate("receiverId", "fullname profilePicture")
      .sort({ createdAt: -1 });
    
    res.status(200).json(calls);
  } catch (error) {
    console.log("Error in getCallHistory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



