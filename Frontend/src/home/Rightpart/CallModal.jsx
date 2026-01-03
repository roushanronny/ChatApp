import React, { useEffect, useRef, useState } from "react";
import { FaPhone, FaVideo, FaTimes, FaPhoneSlash } from "react-icons/fa";
import { useSocketContext } from "../../context/SocketContext.jsx";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { getApiUrl } from "../../config/api.js";

function CallModal({ isOpen, onClose, callType, selectedConversation }) {
  const { socket } = useSocketContext();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callIdRef = useRef(null);
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));

  // HD Video constraints for better quality
  const getMediaConstraints = () => {
    if (callType === "video") {
      return {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // High quality audio
          channelCount: 2 // Stereo
        }
      };
    } else {
      return {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        }
      };
    }
  };

  // Create RTCPeerConnection with ICE servers
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to peer connection
    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("callUser", {
          to: selectedConversation._id,
          signalData: event.candidate,
          from: authUser?.user?._id,
          name: authUser?.user?.fullname
        });
      }
    };

    return peerConnection;
  };

  // Update video element when stream changes
  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

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
              status: "missed",
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
      
      // Get user media with HD settings
      navigator.mediaDevices
        .getUserMedia(getMediaConstraints())
        .then((currentStream) => {
          setStream(currentStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = currentStream;
          }

          // Create peer connection
          peerConnectionRef.current = createPeerConnection();

          // Create and send offer
          peerConnectionRef.current
            .createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: callType === "video",
            })
            .then((offer) => {
              return peerConnectionRef.current.setLocalDescription(offer);
            })
            .then(() => {
              // Send offer to receiver via socket
              socket.emit("callUser", {
                to: selectedConversation._id,
                signalData: peerConnectionRef.current.localDescription,
                from: authUser?.user?._id,
                name: authUser?.user?.fullname,
                callType: callType
              });
              console.log("Call offer sent");
            })
            .catch((err) => {
              console.error("Error creating offer:", err);
              toast.error("Error initiating call");
            });
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
          toast.error("Camera/Microphone access denied");
        });

      // Listen for call acceptance with answer signal
      socket.on("callAccepted", async ({ signal, from }) => {
        try {
          setCallAccepted(true);
          
          // Set remote description (answer) if not already set
          if (peerConnectionRef.current && signal) {
            const remoteDesc = new RTCSessionDescription(signal);
            if (peerConnectionRef.current.remoteDescription === null) {
              await peerConnectionRef.current.setRemoteDescription(remoteDesc);
              console.log("Remote description (answer) set");
            }
          }
          
          // Update call status to answered
          if (callIdRef.current) {
            await updateCallStatus("answered");
          }
          
          console.log("Call accepted and connected");
        } catch (error) {
          console.error("Error accepting call:", error);
          toast.error("Error accepting call");
        }
      });

      // Listen for ICE candidates and other signals from remote peer
      socket.on("callUser", async ({ signalData, from, callType: remoteCallType }) => {
        if (signalData && peerConnectionRef.current) {
          try {
            // If it's an ICE candidate
            if (signalData.candidate) {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(signalData)
              );
              console.log("ICE candidate added");
            }
          } catch (error) {
            console.error("Error handling signal:", error);
          }
        }
      });

      socket.on("callEnded", () => {
        handleEndCall();
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (socket) {
        socket.off("callAccepted");
        socket.off("callUser");
        socket.off("callEnded");
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
    
    // Stop local stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear video refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Update call status
    if (callIdRef.current) {
      await updateCallStatus(callAccepted ? "answered" : "missed");
    }
    
    // Notify other party
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
                  {/* When call is accepted: Show remote video full screen */}
                  {callAccepted && (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* When calling (not accepted yet): Show local video full screen */}
                  {!callAccepted && !callEnded && (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Contact info overlay when calling */}
                  {!callAccepted && !callEnded && (
                    <div className="absolute top-4 left-4 bg-[#111B21] bg-opacity-80 rounded-lg px-4 py-3 flex items-center space-x-3 z-20">
                      <div className="w-12 h-12 bg-[#313D45] rounded-full flex items-center justify-center flex-shrink-0">
                        {selectedConversation?.profilePicture ? (
                          <img 
                            src={selectedConversation.profilePicture} 
                            alt={selectedConversation?.fullname || selectedConversation?.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xl text-[#8696A0]">
                            {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{selectedConversation?.fullname || selectedConversation?.name}</p>
                        <p className="text-[#8696A0] text-sm">Calling...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Local video as PIP when call is accepted */}
                  {callAccepted && (
                    <div className="absolute bottom-4 right-4 w-48 h-36 bg-[#202C33] rounded-lg overflow-hidden shadow-lg border-2 border-[#313D45] z-10">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
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

