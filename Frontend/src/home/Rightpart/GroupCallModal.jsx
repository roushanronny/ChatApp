import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaCircle, FaComment, FaEllipsisV, FaTimes } from "react-icons/fa";
import { useSocketContext } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthProvider.jsx";
import toast from "react-hot-toast";

function GroupCallModal({ isOpen, onClose, participants = [], callType = "video" }) {
  const { socket } = useSocketContext();
  const [authUser] = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mainSpeaker, setMainSpeaker] = useState(0); // Index of main speaker
  const [showChat, setShowChat] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  const localVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const streamRef = useRef(null);
  const callTimerRef = useRef(null);
  const participantsWithVideoRef = useRef({});

  // Get current user
  const currentUser = authUser?.user || authUser;

  // Initialize local stream
  useEffect(() => {
    if (!isOpen) return;

    const initLocalStream = async () => {
      try {
        const constraints = {
          video: isVideoOn ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (localVideoRef.current && isVideoOn) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(err => console.error("Error playing video:", err));
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        toast.error("Could not access camera/microphone");
      }
    };

    initLocalStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, isVideoOn]);

  // Call duration timer
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      return;
    }

    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isOpen]);

  // Format call duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle mute
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const newMuteState = !isMuted;
      audioTracks.forEach(track => {
        track.enabled = newMuteState;
      });
      setIsMuted(newMuteState);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!streamRef.current) return;

    const newVideoState = !isVideoOn;
    
    try {
      if (newVideoState) {
        // Turn video on
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        streamRef.current.addTrack(videoTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
          localVideoRef.current.play().catch(err => console.error("Error playing video:", err));
        }
      } else {
        // Turn video off
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          streamRef.current.removeTrack(track);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
      setIsVideoOn(newVideoState);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
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
          screenShareRef.current.play().catch(err => console.error("Error playing screen:", err));
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

  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement recording functionality
  };

  // End call
  const handleEndCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (screenShareRef.current && screenShareRef.current.srcObject) {
      screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
      screenShareRef.current.srcObject = null;
    }
    onClose();
  };

  if (!isOpen) return null;

  // Combine current user with participants
  const allParticipants = [
    {
      _id: currentUser?._id,
      fullname: currentUser?.fullname || "You",
      profilePicture: currentUser?.profilePicture || "",
      isLocal: true,
      isMuted: isMuted,
      isVideoOn: isVideoOn
    },
    ...participants.map(p => ({
      ...p,
      isLocal: false,
      isMuted: p.isMuted || false,
      isVideoOn: p.isVideoOn !== false
    }))
  ];

  // Get main speaker and other participants
  const mainParticipant = allParticipants[mainSpeaker] || allParticipants[0];
  const otherParticipants = allParticipants.filter((_, index) => index !== mainSpeaker).slice(0, 4);

  // Get user initial
  const getUserInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  // Get user avatar
  const getUserAvatar = (participant) => {
    if (participant.profilePicture) {
      return participant.profilePicture;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Top Bar - Recording indicator and controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        {isRecording && (
          <div className="bg-gray-800/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{formatDuration(callDuration)}</span>
          </div>
        )}
        {isScreenSharing && (
          <div className="bg-gray-800/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2">
            <FaDesktop className="w-4 h-4" />
            <span className="text-sm font-medium">Sharing Screen</span>
          </div>
        )}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Main Speaker Video (Large) */}
        <div className="flex-1 bg-gray-800 rounded-2xl overflow-hidden relative">
          {mainParticipant.isVideoOn && getUserAvatar(mainParticipant) ? (
            <video
              ref={mainParticipant.isLocal ? localVideoRef : null}
              autoPlay
              playsInline
              muted={mainParticipant.isLocal}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-white text-5xl font-semibold">
                {getUserInitial(mainParticipant.fullname)}
              </div>
            </div>
          )}
          
          {/* Participant name overlay */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg">
            <div className="font-medium">{mainParticipant.fullname}</div>
            {mainParticipant.isMuted && (
              <div className="flex items-center gap-1 text-sm text-red-300 mt-1">
                <FaMicrophoneSlash className="w-3 h-3" />
                <span>Muted</span>
              </div>
            )}
          </div>
        </div>

        {/* Other Participants Row (Smaller videos) */}
        {otherParticipants.length > 0 && (
          <div className="flex gap-4 h-32">
            {otherParticipants.map((participant, index) => (
              <div
                key={participant._id || index}
                className="flex-1 bg-gray-800 rounded-xl overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setMainSpeaker(allParticipants.findIndex(p => p._id === participant._id))}
              >
                {participant.isVideoOn && getUserAvatar(participant) ? (
                  <video
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-xl font-semibold">
                      {getUserInitial(participant.fullname)}
                    </div>
                  </div>
                )}
                
                {/* Participant name and status */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/50 text-white px-2 py-1 rounded text-xs font-medium truncate">
                    {participant.fullname}
                  </div>
                  {participant.isMuted && (
                    <div className="absolute bottom-2 right-2 bg-black/70 p-1 rounded">
                      <FaMicrophoneSlash className="w-3 h-3 text-red-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Fill empty slots */}
            {Array.from({ length: Math.max(0, 4 - otherParticipants.length) }).map((_, index) => (
              <div key={`empty-${index}`} className="flex-1 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        )}
      </div>

      {/* Screen Share View (if active) */}
      {isScreenSharing && (
        <div className="absolute inset-0 bg-black z-20">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <button
            onClick={toggleScreenShare}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Left side controls */}
          <div className="flex items-center gap-3">
            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
            </button>

            {/* Video On/Off */}
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoOn
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isVideoOn ? <FaVideo className="w-5 h-5" /> : <FaVideoSlash className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isScreenSharing
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <FaDesktop className="w-5 h-5" />
            </button>

            {/* Recording */}
            <button
              onClick={toggleRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <FaCircle className="w-5 h-5" />
            </button>

            {/* Chat */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                showChat
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <FaComment className="w-5 h-5" />
            </button>

            {/* More Options */}
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
            >
              <FaEllipsisV className="w-5 h-5" />
            </button>
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <FaTimes className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* Chat Panel (Sidebar) */}
      {showChat && (
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
  );
}

export default GroupCallModal;

