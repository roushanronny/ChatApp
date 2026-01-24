import React, { useEffect, useRef, useState } from "react";
import { FaPhone, FaVideo, FaTimes, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaDesktop, FaCircle, FaComment, FaEllipsisV, FaVideoSlash } from "react-icons/fa";
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null); // Store stream in ref to access in event handlers
  const screenShareRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const callIdRef = useRef(null);
  const incomingOfferRef = useRef(null); // Store the incoming offer
  const authUser = JSON.parse(localStorage.getItem("ChatApp"));

  // Toggle mute/unmute
  const toggleMute = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("🎤 Toggle mute clicked, current state:", isMuted);
    
    const currentStream = streamRef.current || stream;
    const newMuteState = !isMuted;
    
    if (currentStream) {
      const audioTracks = currentStream.getAudioTracks();
      audioTracks.forEach(track => {
        // When muted (newMuteState = true), track should be disabled (enabled = false)
        // When unmuted (newMuteState = false), track should be enabled (enabled = true)
        track.enabled = !newMuteState;
        console.log(`Audio track ${track.id} enabled:`, track.enabled, "muted:", newMuteState);
      });
      setIsMuted(newMuteState);
      console.log("🎤 Mute state changed to:", newMuteState ? "MUTED" : "UNMUTED");
    } else {
      // Even without stream, update the state for UI feedback
      setIsMuted(newMuteState);
      console.warn("No stream available to toggle mute, but UI state updated");
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
          safePlayVideo(screenShareRef.current, "screen share");
        }

        setIsScreenSharing(true);

        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = null;
          }
        };
      } else {
        // Stop screen share
        if (screenShareRef.current && screenShareRef.current.srcObject) {
          screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      setIsScreenSharing(false);
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
  const toggleVideo = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📹 Toggle video/audio clicked, current type:", currentCallType);
    
    const currentStream = streamRef.current || stream;
    const newCallType = currentCallType === "video" ? "audio" : "video";
    
    try {
      if (newCallType === "video") {
        // Switch to video: add video track
        console.log("🎥 Switching to video call - requesting camera access");
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
        
        if (currentStream) {
          // Add video track to existing stream
          currentStream.addTrack(videoTrack);
          streamRef.current = currentStream; // Update ref
          setStream(currentStream); // Update state to trigger re-render
          console.log("✅ Video track added to existing stream");
        } else {
          // No stream yet, create new one
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTrack = audioStream.getAudioTracks()[0];
          const newStream = new MediaStream([audioTrack, videoTrack]);
          setStream(newStream);
          streamRef.current = newStream;
          console.log("✅ New stream created with video");
          audioStream.getTracks().forEach(track => {
            if (track !== audioTrack) track.stop();
          });
        }
        
        const finalStream = streamRef.current || stream;
        
        // Update video element immediately
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = finalStream;
          safePlayVideo(localVideoRef.current, "local video (toggle video)");
          console.log("✅ Local video element updated");
        }
        
        // Add video track to peer connection
        if (peerConnectionRef.current) {
          const finalStreamForPC = streamRef.current || stream;
          if (finalStreamForPC) {
            peerConnectionRef.current.addTrack(videoTrack, finalStreamForPC);
            console.log("✅ Video track added to peer connection");
          }
        }
        
        // Clean up unused tracks
        videoStream.getTracks().forEach(track => {
          if (track !== videoTrack) track.stop();
        });
        
        console.log("✅ Successfully switched to video call");
        toast.success("Switched to video call");
      } else {
        // Switch to audio: remove video track
        console.log("📞 Switching to audio call - removing video");
        
        if (currentStream) {
          const videoTracks = currentStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            currentStream.removeTrack(track);
            console.log("✅ Video track stopped and removed");
          });
          
          // Update ref and state
          streamRef.current = currentStream;
          setStream(currentStream);
          
          // Remove from peer connection
          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders();
            senders.forEach(sender => {
              if (sender.track && sender.track.kind === 'video') {
                peerConnectionRef.current.removeTrack(sender);
                console.log("✅ Video sender removed from peer connection");
              }
            });
          }
        }
        
        // Clear/hide video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          console.log("✅ Local video element cleared");
        }
        
        console.log("✅ Successfully switched to audio call");
        toast.success("Switched to audio call");
      }
      
      // Update call type state
      setCurrentCallType(newCallType);
      
      // Notify peer about call type change (if connected)
      if (socket && selectedConversation) {
        socket.emit("callUser", {
          to: selectedConversation._id,
          signalData: { type: "callTypeChange", callType: newCallType },
          from: authUser?.user?._id,
          name: authUser?.user?.fullname,
          callType: newCallType
        });
        console.log("📤 Notified peer about call type change:", newCallType);
      }
    } catch (error) {
      console.error("❌ Error toggling video:", error);
      toast.error(`Error switching to ${newCallType} call: ${error.message}`);
      
      // Revert on error
      setCurrentCallType(currentCallType);
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
          
          // Use safe play function
          safePlayVideo(remoteVideoRef.current, "remote video");
        } else {
          console.warn("⚠️ remoteVideoRef.current is null - video element not ready");
          // Retry after component re-renders
          setTimeout(() => {
            if (remoteVideoRef.current && remoteStream) {
              console.log("Retrying to set remote video stream");
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.muted = false;
              remoteVideoRef.current.volume = 1.0;
              safePlayVideo(remoteVideoRef.current, "remote video (retry)");
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

  // Helper function to safely play video
  const safePlayVideo = async (videoElement, label = "video") => {
    if (!videoElement) return;
    
    try {
      // Pause first to avoid conflicts
      if (videoElement.readyState >= 2) {
        videoElement.pause();
      }
      
      // Wait a tiny bit before playing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log(`✅ ${label} playing successfully`);
      }
    } catch (err) {
      // AbortError is normal when srcObject changes rapidly - ignore it
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
        // Silently ignore - these are expected in some scenarios
        return;
      }
      console.error(`Error playing ${label}:`, err);
    }
  };

  // Update video element when stream changes
  useEffect(() => {
    if (stream && localVideoRef.current && !callEnded && stream instanceof MediaStream) {
      console.log("Updating local video element with stream");
      localVideoRef.current.srcObject = stream;
      safePlayVideo(localVideoRef.current, "local video");
    }
    
    // Also update if streamRef exists but state stream doesn't
    if (!stream && streamRef.current && localVideoRef.current && !callEnded && streamRef.current instanceof MediaStream) {
      console.log("Updating local video from streamRef");
      localVideoRef.current.srcObject = streamRef.current;
      safePlayVideo(localVideoRef.current, "local video (from ref)");
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
      const signalData = incomingCall?.signalData || incomingCall;
      if (incomingCall && signalData && signalData.type === "offer") {
        console.log("📞 Incoming call received - waiting for user to accept/reject");
        console.log("Incoming call data:", incomingCall);
        console.log("Signal data:", signalData);
        
        // Update call type
        setCurrentCallType(callType || incomingCall.callType || "video");
        setIsIncomingCall(true);
        // Store the offer SDP
        incomingOfferRef.current = signalData; // Store the offer SDP
        
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
            safePlayVideo(localVideoRef.current, "local video (outgoing call)");
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
              safePlayVideo(localVideoRef.current, "local video (PIP)");
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
        if (currentStream && currentStream instanceof MediaStream) {
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
        
        toast("Call ended by other party", { icon: "📞" });
        
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

      // Set up callEnded listener - ALWAYS listen when modal is open
      console.log("🔔 Setting up callEnded listener");
      socket.on("callEnded", handleCallEnded);
    }

    return () => {
      console.log("🧹 Cleaning up CallModal useEffect");
      
      // Stop stream
      const currentStream = streamRef.current || stream;
      if (currentStream && currentStream instanceof MediaStream) {
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
        // Remove all callEnded listeners
        socket.off("callEnded");
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
  const handleAcceptCall = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📞 Accept call button clicked");
    
    if (!incomingOfferRef.current || !selectedConversation) {
      console.warn("Cannot accept call - missing offer or conversation");
      return;
    }
    
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
        safePlayVideo(localVideoRef.current, "local video (accept call)");
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
  const handleRejectCall = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("❌ Reject call button clicked - rejecting incoming call");
    
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

  const handleEndCall = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log("📞 End call button clicked - performing cleanup");
    
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

  // Debug logs
  console.log("📱 CallModal Render:", {
    isIncomingCall,
    callAccepted,
    callEnded,
    hasStream: !!(stream || streamRef.current),
    currentCallType
  });

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Full screen video call container */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
        {currentCallType === "video" && (
          <>
            {/* When call is accepted: Group call layout (like image) */}
            {callAccepted && !callEnded ? (
              <div className="flex-1 flex flex-col p-4 gap-4 bg-gray-100 relative">
                {/* Recording indicator - Top Left */}
                {isRecording && (
                  <div className="absolute top-4 left-4 z-10 bg-gray-800/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{formatDuration(callDuration)}</span>
                  </div>
                )}
                
                {/* Main Video Area (Top 2/3) */}
                <div className="flex-1 bg-gray-800 rounded-2xl overflow-hidden relative min-h-0">
                  {/* Remote video - main feed */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => {
                      console.log("📹 Remote video metadata loaded");
                      if (remoteVideoRef.current) {
                        remoteVideoRef.current.muted = false;
                        remoteVideoRef.current.volume = 1.0;
                        safePlayVideo(remoteVideoRef.current, "remote video (metadata loaded)");
                      }
                    }}
                  />
                  
                  {/* Participant name overlay - bottom left */}
                  <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg">
                    <div className="font-medium">{selectedConversation?.fullname || selectedConversation?.name}</div>
                  </div>
                </div>
                
                {/* Participant Videos Row (Bottom 1/3) */}
                <div className="flex gap-4 h-32 flex-shrink-0">
                  {/* Local video - small participant video */}
                  {(stream || streamRef.current) && (
                    <div className="flex-1 bg-gray-800 rounded-xl overflow-hidden relative">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => {
                          if (localVideoRef.current) {
                            safePlayVideo(localVideoRef.current, "local video (pre-accept)");
                          }
                        }}
                      />
                      {/* Local user name */}
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
                        {authUser?.user?.fullname || "You"}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty slots for future participants */}
                  {Array.from({ length: Math.max(0, 4 - 1) }).map((_, index) => (
                    <div key={`empty-${index}`} className="flex-1 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            ) : !callEnded ? (
              /* When calling (not accepted yet): Show recipient profile with local video PIP */
              <>
                {/* Background - white */}
                <div className="absolute inset-0 bg-white flex items-center justify-center">
                </div>
                
                {/* Caller info overlay - top left (small rounded box) */}
                {!isIncomingCall && (
                  <div className="absolute top-6 left-6 z-30 bg-white border border-gray-300 px-3 py-2 rounded-lg flex items-center space-x-3 shadow-sm">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {authUser?.user?.profilePicture ? (
                        <img 
                          src={authUser.user.profilePicture} 
                          alt={authUser?.user?.fullname || "You"}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-gray-700 font-semibold">
                          {(authUser?.user?.fullname || "You")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-sm">{authUser?.user?.fullname || "You"}</p>
                      <p className="text-gray-500 text-xs">Calling...</p>
                    </div>
                  </div>
                )}
                
                {/* Local video as small PIP - top right (only when we have stream) */}
                {(stream || streamRef.current) && !isIncomingCall && (
                  <div className="absolute top-6 right-6 w-32 h-44 bg-gray-200 rounded-lg overflow-hidden shadow-lg border border-gray-300 z-20">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => {
                        console.log("📹 Local video metadata loaded (pre-accept)");
                        if (localVideoRef.current) {
                          safePlayVideo(localVideoRef.current, "local video (pre-accept metadata)");
                        }
                      }}
                    />
                    {/* Green dot indicator */}
                    <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                  </div>
                )}
                
                {/* Recipient info - centered (large avatar with name and status) */}
                {!isIncomingCall && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    {/* Large circular avatar with shadow effect */}
                    <div className="relative mb-6">
                      <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center shadow-lg">
                        {selectedConversation?.profilePicture ? (
                          <img 
                            src={selectedConversation.profilePicture} 
                            alt={selectedConversation?.fullname || selectedConversation?.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-7xl text-gray-600 font-semibold">
                            {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Subtle shadow effect behind */}
                      <div className="absolute inset-0 w-48 h-48 bg-gray-300 rounded-full -z-10 blur-xl opacity-50"></div>
                    </div>
                    <p className="text-gray-900 text-2xl font-semibold mb-2 tracking-wide uppercase">
                      {selectedConversation?.fullname || selectedConversation?.name}
                    </p>
                    <p className="text-gray-500 text-lg">Ringing...</p>
                  </div>
                )}
                
                {/* Incoming Call UI - White Theme */}
                {isIncomingCall && !callAccepted && !callEnded && (
                  <>
                    {/* Light overlay */}
                    <div className="absolute inset-0 bg-white/90 z-10"></div>
                    
                    {/* Caller's video feed as background (if available) */}
                      {remoteVideoRef.current?.srcObject && (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                        onLoadedMetadata={() => {
                          if (remoteVideoRef.current) {
                            safePlayVideo(remoteVideoRef.current, "remote video (incoming background)");
                          }
                        }}
                      />
                    )}
                    
                    {/* Center Content - Caller Info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-6">
                      {/* Large Profile Picture */}
                      <div className="w-48 h-48 bg-blue-500 rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 border-blue-200">
                        {selectedConversation?.profilePicture ? (
                          <img 
                            src={selectedConversation.profilePicture} 
                            alt={selectedConversation?.fullname || selectedConversation?.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-7xl text-white font-bold">
                            {(selectedConversation?.fullname || selectedConversation?.name || "U")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Caller Name */}
                      <p className="text-gray-900 text-4xl font-semibold mb-3 text-center">
                        {selectedConversation?.fullname || selectedConversation?.name}
                      </p>
                      
                      {/* Call Type */}
                      <p className="text-gray-600 text-xl mb-12">
                        {currentCallType === "video" ? "Incoming video call" : "Incoming audio call"}
                      </p>
                      
                      {/* Animated Rings */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 rounded-full border-4 border-blue-500/30 animate-ping"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-56 h-56 rounded-full border-4 border-blue-500/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaVideo className="text-3xl text-gray-600" />
                  </div>
                  <p className="text-gray-900 text-lg font-semibold">{selectedConversation?.fullname || selectedConversation?.name}</p>
                  <p className="text-gray-500 mt-2">Call Ended</p>
                </div>
              </div>
            )}
          </>
        )}

      {currentCallType === "audio" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Profile Picture */}
            <div className="w-40 h-40 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
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
            <p className="text-gray-900 text-3xl font-semibold mb-3">
              {selectedConversation?.fullname || selectedConversation?.name}
            </p>
            
            {/* Status */}
            {callEnded ? (
              <p className="text-red-600 text-xl font-medium">Call Ended</p>
            ) : isIncomingCall && !callAccepted ? (
              <p className="text-gray-600 text-xl mb-2">Incoming audio call</p>
            ) : !isIncomingCall && !callAccepted ? (
              <p className="text-gray-600 text-xl mb-2">Ringing...</p>
            ) : callAccepted ? (
              <p className="text-green-600 text-xl font-medium">Connected</p>
            ) : null}
            
            {/* Calling animation */}
            {!callAccepted && !callEnded && (
              <div className="flex justify-center space-x-3 mt-6">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        )}

      {/* Incoming Call Accept/Reject Buttons - WhatsApp Style */}
      {isIncomingCall && !callAccepted && !callEnded && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-4" style={{ pointerEvents: 'auto' }}>
          {/* Accept/Reject Buttons - Large and Prominent */}
          <div className="flex items-center space-x-8">
            {/* Reject Button - Red */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("❌ Reject call button clicked");
                handleRejectCall(e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl transform hover:scale-110 active:scale-95 ring-4 ring-red-500/30 cursor-pointer z-[101]"
              title="Reject Call (Reject करें)"
              aria-label="Reject Call"
            >
              <FaPhoneSlash className="text-3xl" />
            </button>

            {/* Accept Button - Green (WhatsApp Style) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("✅ Accept call button clicked - accepting incoming call");
                handleAcceptCall(e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1DA851] text-white w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl transform hover:scale-110 active:scale-95 ring-4 ring-[#25D366]/30 cursor-pointer z-[101] animate-pulse"
              title={currentCallType === "video" ? "Accept Video Call (Video Call स्वीकार करें)" : "Accept Audio Call (Audio Call स्वीकार करें)"}
              aria-label="Accept Call"
            >
              {currentCallType === "video" ? (
                <FaVideo className="text-3xl" />
              ) : (
                <FaPhone className="text-3xl" />
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center mt-2">
            <p className="text-sm text-gray-600 font-medium">
              {currentCallType === "video" ? "Video Call स्वीकार करने के लिए हरे बटन पर क्लिक करें" : "Audio Call स्वीकार करने के लिए हरे बटन पर क्लिक करें"}
            </p>
          </div>
        </div>
      )}

      {/* Control Bar for Outgoing Call (Before Accepted) */}
      {!isIncomingCall && !callAccepted && !callEnded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-lg" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center gap-4">
            {/* Mute/Unmute - Always visible */}
            <button
              onClick={(e) => toggleMute(e)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
            </button>

            {/* Video On/Off Toggle (for video calls) */}
            {currentCallType === "video" && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("📹 Video toggle (on/off) clicked");
                  const currentStream = streamRef.current || stream;
                  if (currentStream && currentStream instanceof MediaStream) {
                    const videoTracks = currentStream.getVideoTracks();
                    if (videoTracks.length > 0) {
                      const videoTrack = videoTracks[0];
                      const newEnabled = !videoTrack.enabled;
                      videoTrack.enabled = newEnabled;
                      console.log("✅ Video track enabled:", newEnabled);
                      
                      // Update peer connection if exists
                      if (peerConnectionRef.current) {
                        const sender = peerConnectionRef.current.getSenders().find(s => 
                          s.track && s.track.kind === 'video'
                        );
                        if (sender) {
                          await sender.replaceTrack(newEnabled ? videoTrack : null);
                        }
                      }
                      
                          // Force UI update
                          if (localVideoRef.current) {
                            localVideoRef.current.srcObject = currentStream;
                            if (newEnabled) {
                              safePlayVideo(localVideoRef.current, "local video (toggle on)");
                            }
                          }
                      
                      // Force re-render by updating state
                      setStream(new MediaStream(currentStream.getTracks()));
                    } else {
                      console.warn("❌ No video track found in stream");
                      toast.error("Video track not available");
                    }
                  } else {
                    console.warn("❌ No stream available for video toggle");
                    toast.error("Camera stream not ready");
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false
                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                    : "bg-gray-400 hover:bg-gray-500 text-white shadow-md"
                }`}
                title={stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false ? "Turn off video" : "Turn on video"}
              >
                {stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false ? <FaVideo className="w-5 h-5" /> : <FaVideoSlash className="w-5 h-5" />}
              </button>
            )}

            {/* Switch to Audio/Video Call */}
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔄 Switch video/audio clicked, current type:", currentCallType);
                await toggleVideo(e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100 cursor-pointer"
              title={currentCallType === "video" ? "Switch to Audio Call" : "Switch to Video Call"}
            >
              {currentCallType === "video" ? <FaPhone className="w-5 h-5" /> : <FaVideo className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={(e) => handleEndCall(e)}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer"
              title="End Call"
            >
              <FaPhoneSlash className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

        {/* Control Bar - Bottom (Like Image) - For Accepted Calls */}
        {callAccepted && !callEnded && (
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Left side controls */}
              <div className="flex items-center gap-3">
                {/* Mute/Unmute - Solid blue when active */}
                <button
                  onClick={(e) => toggleMute(e)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isMuted
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                      : "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
                </button>

                {/* Video On/Off - Solid blue when active, always visible for video calls */}
                {currentCallType === "video" && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("📹 Video toggle (on/off) clicked (accepted call)");
                      const currentStream = streamRef.current || stream;
                      if (currentStream && currentStream instanceof MediaStream) {
                        const videoTracks = currentStream.getVideoTracks();
                        if (videoTracks.length > 0) {
                          const videoTrack = videoTracks[0];
                          const newEnabled = !videoTrack.enabled;
                          videoTrack.enabled = newEnabled;
                          console.log("✅ Video track enabled:", newEnabled);
                          
                          // Update peer connection if exists
                          if (peerConnectionRef.current) {
                            const sender = peerConnectionRef.current.getSenders().find(s => 
                              s.track && s.track.kind === 'video'
                            );
                            if (sender) {
                              await sender.replaceTrack(newEnabled ? videoTrack : null);
                            }
                          }
                          
                          // Force UI update
                          if (localVideoRef.current) {
                            localVideoRef.current.srcObject = currentStream;
                            if (newEnabled) {
                              safePlayVideo(localVideoRef.current, "local video (toggle on - accepted)");
                            }
                          }
                          
                          // Force re-render by updating state
                          setStream(new MediaStream(currentStream.getTracks()));
                          toast.success(newEnabled ? "Video turned on" : "Video turned off");
                        } else {
                          console.warn("❌ No video track found");
                          toast.error("Video track not available");
                        }
                      } else {
                        console.warn("❌ No stream available for video toggle");
                        toast.error("Camera stream not ready");
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false
                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                        : "bg-gray-400 hover:bg-gray-500 text-white shadow-md"
                    }`}
                    title={stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false ? "Video On" : "Video Off"}
                  >
                    {stream && stream instanceof MediaStream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0]?.enabled !== false ? <FaVideo className="w-5 h-5" /> : <FaVideoSlash className="w-5 h-5" />}
                  </button>
                )}

                {/* Switch Video/Audio Call Type - Light blue outline style */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔄 Switch video/audio clicked (accepted call), current type:", currentCallType);
                    await toggleVideo(e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100 cursor-pointer"
                  title={currentCallType === "video" ? "Switch to Audio Call" : "Switch to Video Call"}
                >
                  {currentCallType === "video" ? <FaPhone className="w-5 h-5" /> : <FaVideo className="w-5 h-5" />}
                </button>

                {/* Screen Share - Light blue outline style */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🖥️ Screen share clicked");
                    toggleScreenShare();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isScreenSharing
                      ? "bg-blue-100 border-2 border-blue-400 text-blue-600"
                      : "bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100"
                  }`}
                  title="Screen Share"
                >
                  <FaDesktop className="w-5 h-5" />
                </button>

                {/* Recording - Light red when active with pulsing effect */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔴 Recording clicked, current state:", isRecording);
                    setIsRecording(!isRecording);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                    isRecording
                      ? "bg-red-100 border-2 border-red-400 text-red-600"
                      : "bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100"
                  }`}
                  title="Record"
                >
                  <FaCircle className="w-5 h-5" />
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75"></span>
                  )}
                </button>

                {/* Chat - Light blue outline style */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("💬 Chat clicked, current state:", showChat);
                    setShowChat(!showChat);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    showChat
                      ? "bg-blue-100 border-2 border-blue-400 text-blue-600"
                      : "bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100"
                  }`}
                  title="Chat"
                >
                  <FaComment className="w-5 h-5" />
                </button>

                {/* More Options - Light blue outline style */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("⚙️ More options clicked, current state:", showMoreOptions);
                    setShowMoreOptions(!showMoreOptions);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    showMoreOptions
                      ? "bg-blue-100 border-2 border-blue-400 text-blue-600"
                      : "bg-blue-50 border-2 border-blue-300 text-blue-500 hover:bg-blue-100"
                  }`}
                  title="More Options"
                >
                  <FaEllipsisV className="w-5 h-5" />
                </button>
              </div>

              {/* End Call Button - Red rectangular button */}
              <button
                onClick={(e) => handleEndCall(e)}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <FaPhoneSlash className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        )}
      
      {/* Chat Panel (Sidebar) */}
      {showChat && callAccepted && !callEnded && (
        <div className="absolute right-0 top-0 bottom-20 w-80 bg-white border-l border-gray-200 z-30 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-gray-500 text-sm">Chat functionality coming soon...</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default CallModal;

