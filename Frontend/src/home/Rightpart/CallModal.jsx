import React, { useEffect, useRef, useState } from "react";
import { FaPhone, FaVideo, FaTimes, FaPhoneSlash } from "react-icons/fa";
import { useSocketContext } from "../../context/SocketContext.jsx";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

function CallModal({ isOpen, onClose, callType, selectedConversation }) {
  const { socket } = useSocketContext();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callIdRef = useRef(null);
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));

  useEffect(() => {
    if (isOpen && socket && selectedConversation) {
      // Save call to history
      const saveCall = async () => {
        try {
          const token = Cookies.get("jwt");
          const response = await axios.post(
            getApiUrl("/api/call/create"),
            {
              receiverId: selectedConversation._id,
              callType,
              status: "missed", // Will update when answered
            },
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          callIdRef.current = response.data.call._id;
          callStartTimeRef.current = new Date();
          console.log("Call saved to history:", response.data);
        } catch (error) {
          console.error("Error saving call:", error);
        }
      };
      
      saveCall();
      
      // Initialize call
      navigator.mediaDevices
        .getUserMedia({ 
          video: callType === "video",
          audio: true 
        })
        .then((currentStream) => {
          setStream(currentStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = currentStream;
          }
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
          toast.error("Camera/Microphone access denied");
        });

      // Listen for call acceptance
      socket.on("callAccepted", ({ signal }) => {
        setCallAccepted(true);
        // Update call status to answered
        if (callIdRef.current) {
          updateCallStatus("answered");
        }
        // Handle peer connection (simplified - would need WebRTC implementation)
      });

      socket.on("callEnded", () => {
        handleEndCall();
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, socket, selectedConversation, callType]);

  const updateCallStatus = async (status) => {
    if (!callIdRef.current) return;
    
    try {
      const token = Cookies.get("jwt");
      const duration = callStartTimeRef.current 
        ? Math.floor((new Date() - callStartTimeRef.current) / 1000)
        : 0;
      
      await axios.put(
        getApiUrl(`/api/call/update/${callIdRef.current}`),
        { status, duration },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error updating call status:", error);
    }
  };

  const handleEndCall = async () => {
    setCallEnded(true);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    // Update call status
    if (callIdRef.current) {
      await updateCallStatus(callAccepted ? "answered" : "missed");
    }
    
    if (socket && selectedConversation) {
      socket.emit("endCall", { to: selectedConversation._id });
    }
    
    setTimeout(() => {
      onClose();
      setCallAccepted(false);
      setCallEnded(false);
      setStream(null);
      callIdRef.current = null;
      callStartTimeRef.current = null;
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B141A] flex items-center justify-center z-50">
      <div className="bg-[#202C33] rounded-lg p-6 max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-semibold">
            {callType === "video" ? "Video Call" : "Audio Call"}
          </h2>
          <button onClick={handleEndCall} className="text-[#8696A0] hover:text-white transition">
            <FaTimes className="text-2xl" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          {callType === "video" && (
            <div className="relative w-full h-full bg-[#111B21] rounded-lg overflow-hidden min-h-[400px]">
              {stream ? (
                <>
                  {/* Remote video (main) */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: callAccepted ? 'block' : 'none' }}
                  />
                  {/* Local video (picture-in-picture) */}
                  <div className="absolute bottom-4 right-4 w-48 h-36 bg-[#202C33] rounded-lg overflow-hidden shadow-lg border-2 border-[#313D45]">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Waiting for call acceptance */}
                  {!callAccepted && !callEnded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#111B21] bg-opacity-90">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-4">
                          {selectedConversation?.profilePicture ? (
                            <img 
                              src={selectedConversation.profilePicture} 
                              alt={selectedConversation?.fullname || selectedConversation?.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl text-[#8696A0]">
                              {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-white text-lg">{selectedConversation?.fullname || selectedConversation?.name}</p>
                        <p className="text-[#8696A0] mt-2">Calling...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaVideo className="text-3xl text-[#8696A0]" />
                    </div>
                    <p className="text-white text-lg">{selectedConversation?.fullname || selectedConversation?.name}</p>
                    <p className="text-[#8696A0] mt-2">Connecting...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {callType === "audio" && (
            <div className="text-center">
              <div className="w-32 h-32 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-6">
                {selectedConversation?.profilePicture ? (
                  <img 
                    src={selectedConversation.profilePicture} 
                    alt={selectedConversation?.fullname || selectedConversation?.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-[#8696A0]">
                    {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-white text-2xl font-semibold mb-2">
                {selectedConversation?.fullname || selectedConversation?.name}
              </p>
              {!callAccepted && !callEnded && (
                <p className="text-[#8696A0]">Calling...</p>
              )}
            </div>
          )}

          {!callAccepted && !callEnded && callType === "audio" && (
            <div className="flex justify-center space-x-4 mt-6">
              <div className="w-4 h-4 bg-[#25D366] rounded-full animate-pulse"></div>
              <div className="w-4 h-4 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-4 h-4 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}

          {callEnded && (
            <div className="text-white text-center">
              <p className="text-lg text-[#8696A0]">Call Ended</p>
            </div>
          )}

          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition shadow-lg"
            >
              <FaPhoneSlash className="text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallModal;

