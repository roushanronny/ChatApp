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
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [currentCallType, setCurrentCallType] = useState(callType); // Can switch between audio/video
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callIdRef = useRef(null);
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));

  // Toggle mute/unmute
  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    if (remoteVideoRef.current || localVideoRef.current) {
      const audioElement = remoteVideoRef.current || localVideoRef.current;
      if (audioElement) {
        // Try to set audio output device (speaker)
        if ('setSinkId' in audioElement) {
          audioElement.setSinkId(isSpeakerOn ? "default" : "").then(() => {
            setIsSpeakerOn(!isSpeakerOn);
          }).catch(err => {
            console.error("Error setting speaker:", err);
            setIsSpeakerOn(!isSpeakerOn);
          });
        } else {
          // Fallback: just toggle state
          setIsSpeakerOn(!isSpeakerOn);
        }
      } else {
        setIsSpeakerOn(!isSpeakerOn);
      }
    } else {
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // Toggle between audio and video call
  const toggleVideo = async () => {
    if (!stream) return;
    
    const newCallType = currentCallType === "video" ? "audio" : "video";
    
    try {
      if (newCallType === "video") {
        // Switch to video: add video track
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user"
          },
          audio: false
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        // Add video track to existing stream
        stream.addTrack(videoTrack);
        
        // Update video element immediately
        if (localVideoRef.current) {
          // Force update by reassigning stream
          localVideoRef.current.srcObject = null;
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play().catch(err => console.error("Error playing video:", err));
            }
          }, 100);
        }
        
        // Add video track to peer connection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(videoTrack, stream);
        }
        
        // Clean up unused tracks
        videoStream.getTracks().forEach(track => {
          if (track !== videoTrack) track.stop();
        });
        
        console.log("Video track added, stream has video:", stream.getVideoTracks().length > 0);
      } else {
        // Switch to audio: remove video track
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          stream.removeTrack(track);
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find(s => 
              s.track === track
            );
            if (sender) {
              peerConnectionRef.current.removeTrack(sender);
            }
          }
        });
        
        // Clear video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
      
      setCurrentCallType(newCallType);
      
      // Notify peer about call type change (if connected)
      if (socket && selectedConversation && callAccepted) {
        socket.emit("callUser", {
          to: selectedConversation._id,
          signalData: { type: "callTypeChange", callType: newCallType },
          from: authUser?.user?._id,
          name: authUser?.user?.fullname,
          callType: newCallType
        });
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      toast.error("Error switching call type");
    }
  };

  // HD Video constraints for better quality
  const getMediaConstraints = () => {
    if (currentCallType === "video") {
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
      
      // Reset states
      setCurrentCallType(callType);
      setIsMuted(false);
      setIsSpeakerOn(false);
      
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
              offerToReceiveVideo: currentCallType === "video",
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
            {currentCallType === "video" ? "Video Call" : "Audio Call"}
          </h2>
          <button onClick={handleEndCall} className="text-[#8696A0] hover:text-white transition">
            <FaTimes className="text-2xl" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          {currentCallType === "video" && (
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

          {currentCallType === "audio" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Profile Picture */}
              <div className="w-48 h-48 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                {selectedConversation?.profilePicture ? (
                  <img 
                    src={selectedConversation.profilePicture} 
                    alt={selectedConversation?.fullname || selectedConversation?.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-7xl text-[#8696A0]">
                    {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Name */}
              <p className="text-white text-3xl font-semibold mb-2">
                {selectedConversation?.fullname || selectedConversation?.name}
              </p>
              
              {/* Status */}
              {!callAccepted && !callEnded && (
                <p className="text-[#8696A0] text-lg">Ringing...</p>
              )}
              {callAccepted && !callEnded && (
                <p className="text-[#25D366] text-lg">Connected</p>
              )}
              
              {/* Calling animation */}
              {!callAccepted && !callEnded && (
                <div className="flex justify-center space-x-2 mt-4">
                  <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          )}

          {callEnded && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl text-[#8696A0] mb-2">Call Ended</p>
              </div>
            </div>
          )}

          {/* Call Controls Bar - Show for both audio and video calls */}
          {!callEnded && (
            <div className={`${currentCallType === "video" ? "absolute bottom-0 left-0 right-0" : ""} bg-[#111B21] rounded-lg px-6 py-4 flex items-center justify-between ${currentCallType === "video" ? "mx-4 mb-4" : ""}`}>
            {/* Speaker Button */}
            <button
              onClick={toggleSpeaker}
              className={`p-3 rounded-full transition ${
                isSpeakerOn 
                  ? "bg-[#25D366] text-white" 
                  : "bg-[#313D45] text-[#8696A0] hover:bg-[#202C33]"
              }`}
              title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition ${
                currentCallType === "video"
                  ? "bg-[#25D366] text-white"
                  : "bg-[#313D45] text-[#8696A0] hover:bg-[#202C33]"
              }`}
              title={currentCallType === "video" ? "Video On" : "Video Off"}
            >
              <FaVideo className="w-6 h-6" />
            </button>

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition ${
                isMuted
                  ? "bg-red-500 text-white"
                  : "bg-[#313D45] text-[#8696A0] hover:bg-[#202C33]"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L8.293 3.34a1 1 0 011.414 1.414L6.524 7.938a4 4 0 005.538 5.538l2.232 2.232a1 1 0 11-1.414 1.414l-2.232-2.232zM5.11 6.524a6 6 0 008.367 8.367l-1.402-1.402a4 4 0 01-5.537-5.537L5.11 6.524zm8.367 1.414a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition shadow-lg"
              title="End Call"
            >
              <FaPhoneSlash className="text-2xl" />
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallModal;

