import React, { useEffect, useRef, useState } from "react";
import { FaPhone, FaVideo, FaTimes, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useSocketContext } from "../../context/SocketContext.jsx";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { getApiUrl } from "../../config/api.js";

function CallModal({ isOpen, onClose, callType, selectedConversation, incomingCall = null }) {
  const { socket } = useSocketContext();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [currentCallType, setCurrentCallType] = useState(callType); // Can switch between audio/video
  const [isIncomingCall, setIsIncomingCall] = useState(false); // Track if this is an incoming call
  const [callDuration, setCallDuration] = useState(0); // Call duration timer
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null); // Store stream in ref to access in event handlers
  const callStartTimeRef = useRef(null);
  const callIdRef = useRef(null);
  const incomingOfferRef = useRef(null); // Store the incoming offer
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));

  // Toggle mute/unmute
  const toggleMute = () => {
    const currentStream = streamRef.current || stream;
    if (currentStream) {
      const audioTracks = currentStream.getAudioTracks();
      const newMuteState = !isMuted;
      audioTracks.forEach(track => {
        track.enabled = newMuteState;
        console.log(`Audio track ${track.id} enabled:`, track.enabled);
      });
      setIsMuted(newMuteState);
      console.log("🎤 Mute state:", newMuteState ? "MUTED" : "UNMUTED");
    } else {
      console.warn("No stream available to toggle mute");
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
      console.log("📹🎤 Remote track received:", event.track.kind, "enabled:", event.track.enabled, "streams:", event.streams.length);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        
        // Log all tracks in the remote stream
        const remoteTracks = remoteStream.getTracks();
        console.log("Remote stream tracks:", remoteTracks.map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })));
        
        // Set remote video element - force update
        if (remoteVideoRef.current) {
          console.log("✅ Setting remote video stream (audio + video)");
          remoteVideoRef.current.srcObject = remoteStream;
          // Ensure audio is NOT muted for remote video
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          
          // Force play immediately
          remoteVideoRef.current.play()
            .then(() => {
              console.log("✅ Remote video playing successfully");
            })
            .catch(err => {
              console.error("Error playing remote video:", err);
              // Retry after a short delay
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(e => console.error("Retry failed:", e));
                }
              }, 500);
            });
        } else {
          console.warn("⚠️ remoteVideoRef.current is null - video element not ready");
          // Retry after component re-renders
          setTimeout(() => {
            if (remoteVideoRef.current && remoteStream) {
              console.log("Retrying to set remote video stream");
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.muted = false;
              remoteVideoRef.current.volume = 1.0;
              remoteVideoRef.current.play().catch(err => console.error("Error in retry:", err));
            }
          }, 1000);
        }
        
        // Also handle audio-only case (for audio calls)
        if (event.track.kind === 'audio' && !remoteVideoRef.current) {
          console.log("Audio track received for audio call");
        }
      }
    };

    // Handle ICE candidates - Separate event from offer/answer
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && selectedConversation) {
        console.log("🧊 ICE candidate generated, sending to peer");
        socket.emit("iceCandidate", {
          to: selectedConversation._id,
          candidate: event.candidate,
          from: authUser?.user?._id
        });
      } else if (!event.candidate) {
        console.log("✅ All ICE candidates sent");
      }
    };

    return peerConnection;
  };

  // Update video element when stream changes
  useEffect(() => {
    if (stream && localVideoRef.current && !callEnded) {
      console.log("Updating local video element with stream");
      localVideoRef.current.srcObject = stream;
      // Force play to ensure video displays
      localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
    }
    
    // Also update if streamRef exists but state stream doesn't
    if (!stream && streamRef.current && localVideoRef.current && !callEnded) {
      console.log("Updating local video from streamRef");
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
    }
  }, [stream, currentCallType, callEnded]);

  useEffect(() => {
    if (isOpen && socket && selectedConversation) {
      // Reset states
      setCurrentCallType(callType || "video");
      setIsMuted(false);
      setIsSpeakerOn(false);
      
      // If this is an incoming call (receiver), just store the offer and wait for user to accept
      // Check if incomingCall has signalData with type "offer" (from Right.jsx handler)
      if (incomingCall && incomingCall.signalData && incomingCall.signalData.type === "offer") {
        console.log("📞 Incoming call received - waiting for user to accept/reject");
        console.log("Incoming call data:", incomingCall);
        
        // Update call type
        setCurrentCallType(callType || incomingCall.callType || "video");
        setIsIncomingCall(true);
        incomingOfferRef.current = incomingCall.signalData; // Store the offer SDP (not the whole object)
        
        // Save call to history as missed (will update to answered if accepted)
        const saveCall = async () => {
          try {
            const token = Cookies.get("jwt");
            const response = await axios.post(
              getApiUrl("/api/call/create"),
              {
                receiverId: selectedConversation._id,
                callType: callType || incomingCall.callType || "video",
                status: "missed", // Will be updated to answered if user accepts
              },
              {
                withCredentials: true,
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            callIdRef.current = response.data.call._id;
            console.log("Call saved to history:", response.data);
          } catch (error) {
            console.error("Error saving call:", error);
          }
        };
        
        saveCall();
        return; // Exit early - don't auto-answer, wait for user action
      }
      
      // This is an outgoing call (caller) - initiate call
      console.log("Initiating outgoing call");
      
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
          console.log("✅ Got user media, tracks:", currentStream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })));
          
          // Ensure all tracks are enabled
          currentStream.getTracks().forEach(track => {
            track.enabled = true;
            console.log(`Track ${track.kind} enabled:`, track.enabled);
          });
          
          setStream(currentStream);
          streamRef.current = currentStream; // Store in ref for event handlers
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = currentStream;
            localVideoRef.current.muted = true; // Mute local video (we don't want echo)
            localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
            console.log("✅ Local video element updated");
          }

          // Create peer connection
          peerConnectionRef.current = createPeerConnection();
          
          // Add tracks to peer connection
          currentStream.getTracks().forEach(track => {
            console.log("Adding track to peer connection:", track.kind, track.id);
            peerConnectionRef.current.addTrack(track, currentStream);
          });
          
          console.log("✅ All tracks added to peer connection for outgoing call");

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
              const offerData = {
                to: selectedConversation._id,
                signalData: peerConnectionRef.current.localDescription,
                from: authUser?.user?._id,
                name: authUser?.user?.fullname,
                callType: callType
              };
              console.log("📤 Sending call offer:", offerData);
              socket.emit("callUser", offerData);
              console.log("✅ Call offer sent to:", selectedConversation._id);
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
          console.log("✅ Call accepted by receiver, setting remote description");
          setCallAccepted(true);
          
          // Set remote description (answer) if not already set
          if (peerConnectionRef.current && signal) {
            const remoteDesc = new RTCSessionDescription(signal);
            if (peerConnectionRef.current.remoteDescription === null) {
              await peerConnectionRef.current.setRemoteDescription(remoteDesc);
              console.log("✅ Remote description (answer) set by caller");
            }
          }
          
          // Update call status to answered
          if (callIdRef.current) {
            await updateCallStatus("answered");
          }
          
          // Ensure local video is displayed in PIP
          setTimeout(() => {
            if (localVideoRef.current && (streamRef.current || stream)) {
              const videoStream = streamRef.current || stream;
              localVideoRef.current.srcObject = videoStream;
              localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
              console.log("✅ Local video set for PIP");
            }
          }, 100);
          
          console.log("✅ Call accepted and connected - waiting for remote stream");
        } catch (error) {
          console.error("Error accepting call:", error);
          toast.error("Error accepting call");
        }
      });

      // Listen for ICE candidates from remote peer (separate event)
      socket.on("iceCandidate", async ({ candidate, from }) => {
        console.log("🧊 ICE candidate received from:", from);
        
        if (peerConnectionRef.current && candidate && isOpen) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("✅ ICE candidate added successfully");
          } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
          }
        }
      });

      // Handle call end from remote party - MUST be defined before other handlers
      const handleCallEnded = () => {
        console.log("📞📞📞 CALL ENDED EVENT RECEIVED - cleaning up immediately");
        
        // Use refs to get current values (not stale closure values)
        const currentStream = streamRef.current;
        const currentPeerConnection = peerConnectionRef.current;
        const currentCallId = callIdRef.current;
        
        // Immediately stop all tracks
        if (currentStream) {
          console.log("🛑 Stopping all stream tracks");
          currentStream.getTracks().forEach((track) => {
            if (track.readyState !== 'ended') {
              track.stop();
              console.log("✅ Stopped track:", track.kind, track.id);
            }
          });
          streamRef.current = null;
          setStream(null);
        }
        
        // Close peer connection
        if (currentPeerConnection) {
          try {
            console.log("🔌 Closing peer connection");
            if (currentPeerConnection.connectionState !== 'closed') {
              currentPeerConnection.close();
            }
            peerConnectionRef.current = null;
          } catch (err) {
            console.error("Error closing peer connection:", err);
          }
        }
        
        // Clear video refs immediately
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          try {
            localVideoRef.current.pause();
          } catch (e) {}
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
          try {
            remoteVideoRef.current.pause();
          } catch (e) {}
        }
        
        // Capture current accepted state before updating
        const isCurrentlyAccepted = callAccepted;
        
        // Set call ended state immediately (before async operations)
        setCallEnded(true);
        setCallAccepted(false);
        setIsIncomingCall(false);
        
        // Update call status
        if (currentCallId) {
          updateCallStatus(isCurrentlyAccepted ? "answered" : "missed").catch(err => 
            console.error("Error updating call status:", err)
          );
        }
        
        toast.info("Call ended by other party");
        
        // Close modal immediately - no delay
        console.log("✅ Closing call modal immediately");
        setTimeout(() => {
          onClose();
          // Reset all states
          setCallEnded(false);
          setStream(null);
          setIsIncomingCall(false);
          setCallAccepted(false);
          incomingOfferRef.current = null;
          callIdRef.current = null;
          callStartTimeRef.current = null;
          streamRef.current = null;
        }, 100);
      };

      socket.on("callEnded", handleCallEnded);
    }

    return () => {
      console.log("🧹 Cleaning up CallModal useEffect");
      
      // Stop stream
      const currentStream = streamRef.current || stream;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
        streamRef.current = null;
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        try {
          if (peerConnectionRef.current.connectionState !== 'closed') {
            peerConnectionRef.current.close();
          }
        } catch (e) {
          console.error("Error closing peer connection on cleanup:", e);
        }
        peerConnectionRef.current = null;
      }
      
      // Remove all socket listeners
      if (socket) {
        socket.off("callAccepted");
        socket.off("callUser");
        socket.off("iceCandidate");
        socket.off("callEnded", handleCallEnded);
        console.log("✅ Removed all socket listeners");
      }
    };
  }, [isOpen, socket, selectedConversation, callType, incomingCall, callAccepted]);

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

  // Handle accepting incoming call
  const handleAcceptCall = async () => {
    if (!incomingOfferRef.current || !selectedConversation) return;
    
    console.log("✅ User accepted incoming call");
    setIsIncomingCall(false);
    
    try {
      // Get user media
      const currentStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      const tracks = currentStream.getTracks();
      console.log("✅ Got user media, tracks:", tracks.map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled })));
      
      // Ensure all tracks are enabled
      tracks.forEach(track => {
        track.enabled = true;
        console.log(`Track ${track.kind} enabled:`, track.enabled);
      });
      
      // Set stream in state and ref
      setStream(currentStream);
      streamRef.current = currentStream;
      
      // Update local video element immediately
      if (localVideoRef.current) {
        console.log("Setting local video stream");
        localVideoRef.current.srcObject = currentStream;
        localVideoRef.current.muted = true; // Local video should be muted
        localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
        console.log("✅ Local video element updated");
      } else {
        console.warn("localVideoRef.current is null");
      }

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      console.log("Created peer connection for incoming call");
      
      // Add tracks to peer connection
      tracks.forEach(track => {
        console.log("Adding track to peer connection:", track.kind, track.id, "enabled:", track.enabled);
        peerConnectionRef.current.addTrack(track, currentStream);
      });
      
      console.log("✅ All tracks added to peer connection:", tracks.length);

      // Set remote description (offer) - MUST be done before creating answer
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(incomingOfferRef.current)
      );
      console.log("✅ Remote description (offer) set");

      // Create answer with proper constraints
      const answer = await peerConnectionRef.current.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: currentCallType === "video"
      });
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log("✅ Answer created and local description set");

      // Send answer back to caller
      socket.emit("answerCall", {
        to: selectedConversation._id,
        signal: peerConnectionRef.current.localDescription,
        from: authUser?.user?._id,
      });
      console.log("✅ Answer sent to caller:", selectedConversation._id);

      // Mark as accepted
      setCallAccepted(true);
      callStartTimeRef.current = new Date();
      
      // Update call status to answered
      if (callIdRef.current) {
        await updateCallStatus("answered");
      }
      
      toast.success("Call answered");
    } catch (err) {
      console.error("Error accepting call:", err);
      toast.error("Error accepting call: " + err.message);
    }
  };

  // Handle rejecting incoming call
  const handleRejectCall = async () => {
    console.log("❌ User rejected incoming call");
    
    // Update call status to missed
    if (callIdRef.current) {
      await updateCallStatus("missed");
    }
    
    // Notify caller that call was rejected
    if (socket && selectedConversation) {
      socket.emit("endCall", { to: selectedConversation._id });
    }
    
    // Close modal
    handleEndCall();
  };

  const handleEndCall = async () => {
    console.log("📞 User ending call - performing cleanup");
    
    // Prevent multiple calls
    if (callEnded) {
      console.log("Call already ended, skipping");
      return;
    }
    
    // Use refs to ensure we're stopping the correct stream
    const currentStream = streamRef.current || stream;
    const currentPeerConnection = peerConnectionRef.current;
    
    // Set ended state first to prevent other operations
    setCallEnded(true);
    
    // Stop local stream
    if (currentStream) {
      console.log("🛑 Stopping all stream tracks");
      currentStream.getTracks().forEach((track) => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log("✅ Stopped track:", track.kind, track.id);
        }
      });
      streamRef.current = null;
      setStream(null);
    }
    
    // Close peer connection
    if (currentPeerConnection) {
      try {
        console.log("🔌 Closing peer connection");
        if (currentPeerConnection.connectionState !== 'closed') {
          currentPeerConnection.close();
        }
        peerConnectionRef.current = null;
      } catch (err) {
        console.error("Error closing peer connection:", err);
      }
    }
    
    // Clear video refs
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      try {
        localVideoRef.current.pause();
      } catch (e) {}
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      try {
        remoteVideoRef.current.pause();
      } catch (e) {}
    }
    
    // Update call status
    if (callIdRef.current) {
      try {
        await updateCallStatus(callAccepted ? "answered" : "missed");
      } catch (err) {
        console.error("Error updating call status:", err);
      }
    }
    
    // Notify other party that we're ending the call - ALWAYS emit, even if callEnded is true
    if (socket && selectedConversation) {
      console.log("📤 Notifying other party that call ended, receiverId:", selectedConversation._id);
      try {
        socket.emit("endCall", { to: selectedConversation._id });
        console.log("✅ endCall event emitted to:", selectedConversation._id);
      } catch (err) {
        console.error("Error emitting endCall:", err);
      }
    } else {
      console.warn("Cannot emit endCall - socket or selectedConversation missing");
    }
    
    // Reset states
    setCallAccepted(false);
    setIsIncomingCall(false);
    
    // Close modal immediately
    setTimeout(() => {
      console.log("✅ Closing call modal");
      onClose();
      setCallEnded(false);
      setStream(null);
      incomingOfferRef.current = null;
      callIdRef.current = null;
      callStartTimeRef.current = null;
      streamRef.current = null;
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B141A] z-50 flex flex-col">
      {/* Full screen video call container */}
      <div className="flex-1 relative w-full h-full">
        {currentCallType === "video" && (
          <>
            {/* When call is accepted: Show remote video full screen with local PIP */}
            {callAccepted && !callEnded ? (
              <>
                {/* Remote video - full screen background */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    console.log("📹 Remote video metadata loaded");
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      remoteVideoRef.current.volume = 1.0;
                      remoteVideoRef.current.play().catch(err => console.error("Error playing remote video:", err));
                      console.log("✅ Remote video playing with audio, muted:", remoteVideoRef.current.muted);
                    }
                  }}
                />
                
                {/* Top bar - Timer and Meeting Info (Figma style) */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent z-30 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-white font-semibold text-lg">
                        {selectedConversation?.fullname || selectedConversation?.name || "Video Call"}
                      </div>
                      {callDuration > 0 && (
                        <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-white text-sm font-mono">{formatDuration(callDuration)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Participant count (for future group calls) */}
                      <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-white text-sm">1</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Participant name overlay on video (bottom left) */}
                <div className="absolute bottom-20 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg z-20">
                  <p className="text-white font-semibold text-lg">
                    {selectedConversation?.fullname || selectedConversation?.name}
                  </p>
                </div>
                
                {/* Local video as PIP - top right corner */}
                {(stream || streamRef.current) && (
                  <div className="absolute top-16 right-4 w-40 h-52 bg-[#0B141A] rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 z-20">
                    <video
                      key={`local-pip-${streamRef.current?.id || stream?.id || Date.now()}`}
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => {
                        console.log("📹 Local PIP video metadata loaded");
                        if (localVideoRef.current) {
                          localVideoRef.current.play().catch(err => console.error("Error playing local PIP:", err));
                        }
                      }}
                    />
                    {/* Local user name on PIP */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                      <p className="text-white text-xs font-medium truncate">
                        {authUser?.user?.fullname || "You"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : !callEnded ? (
              /* When calling (not accepted yet): Show local video full screen */
              <>
                {(stream || streamRef.current) && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    onLoadedMetadata={() => {
                      console.log("📹 Local video metadata loaded (pre-accept)");
                      if (localVideoRef.current) {
                        localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
                      }
                    }}
                  />
                )}
                
                {/* Dark overlay for incoming call */}
                {isIncomingCall && (
                  <div className="absolute inset-0 bg-black/60 z-10"></div>
                )}
                
                {/* Contact info overlay when calling - centered */}
                {!callAccepted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <div className="w-32 h-32 bg-[#313D45] rounded-full flex items-center justify-center mb-6 shadow-2xl">
                      {selectedConversation?.profilePicture ? (
                        <img 
                          src={selectedConversation.profilePicture} 
                          alt={selectedConversation?.fullname || selectedConversation?.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl text-white font-semibold">
                          {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-2xl font-semibold mb-2">{selectedConversation?.fullname || selectedConversation?.name}</p>
                    <p className="text-white/70 text-lg">
                      {isIncomingCall ? "Incoming video call..." : "Calling..."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaVideo className="text-3xl text-[#8696A0]" />
                  </div>
                  <p className="text-white text-lg">{selectedConversation?.fullname || selectedConversation?.name}</p>
                  <p className="text-[#8696A0] mt-2">Call Ended</p>
                </div>
              </div>
            )}
          </>
        )}

        {currentCallType === "audio" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0B141A] to-[#111B21]">
            {/* Profile Picture */}
            <div className="w-40 h-40 bg-[#313D45] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
              {selectedConversation?.profilePicture ? (
                <img 
                  src={selectedConversation.profilePicture} 
                  alt={selectedConversation?.fullname || selectedConversation?.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-6xl text-white font-semibold">
                  {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Name */}
            <p className="text-white text-3xl font-semibold mb-3">
              {selectedConversation?.fullname || selectedConversation?.name}
            </p>
            
            {/* Status */}
            {callEnded ? (
              <p className="text-red-400 text-xl">Call Ended</p>
            ) : isIncomingCall && !callAccepted ? (
              <p className="text-white/70 text-xl mb-2">Incoming audio call</p>
            ) : !isIncomingCall && !callAccepted ? (
              <p className="text-white/70 text-xl mb-2">Ringing...</p>
            ) : callAccepted ? (
              <p className="text-[#25D366] text-xl">Connected</p>
            ) : null}
            
            {/* Calling animation */}
            {!callAccepted && !callEnded && (
              <div className="flex justify-center space-x-3 mt-6">
                <div className="w-3 h-3 bg-[#25D366] rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-[#25D366] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        )}

          {/* Incoming Call Accept/Reject Buttons */}
          {isIncomingCall && !callAccepted && !callEnded && (
            <div className={`bg-[#111B21] rounded-lg px-8 py-6 flex items-center justify-center space-x-6 ${currentCallType === "video" ? "absolute bottom-4 left-1/2 -translate-x-1/2 z-30" : "w-full"}`}>
              {/* Reject Button */}
              <button
                onClick={handleRejectCall}
                className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full transition shadow-lg transform hover:scale-110"
                title="Reject Call"
              >
                <FaPhoneSlash className="text-3xl" />
              </button>

              {/* Accept Button */}
              <button
                onClick={handleAcceptCall}
                className="bg-[#25D366] hover:bg-[#20BA5A] text-white p-5 rounded-full transition shadow-lg transform hover:scale-110"
                title="Accept Call"
              >
                {currentCallType === "video" ? (
                  <FaVideo className="text-3xl" />
                ) : (
                  <FaPhone className="text-3xl" />
                )}
              </button>
            </div>
          )}

        {/* Call Controls Bar - Bottom Center (Figma style) */}
        {callAccepted && !callEnded && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all shadow-lg ${
                isMuted
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <FaMicrophoneSlash className="w-5 h-5" />
              ) : (
                <FaMicrophone className="w-5 h-5" />
              )}
            </button>

            {/* Video Toggle Button (only for video calls) */}
            {currentCallType === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all shadow-lg ${
                  stream && stream.getVideoTracks()[0]?.enabled
                    ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
                title={stream && stream.getVideoTracks()[0]?.enabled ? "Video On" : "Video Off"}
              >
                <FaVideo className="w-5 h-5" />
              </button>
            )}

            {/* Speaker Button */}
            <button
              onClick={toggleSpeaker}
              className={`p-4 rounded-full transition-all shadow-lg ${
                isSpeakerOn 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
              }`}
              title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all shadow-2xl transform hover:scale-110 active:scale-95"
              title="End Call"
            >
              <FaPhoneSlash className="text-xl" />
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default CallModal;

