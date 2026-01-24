import React, { useEffect, useState, useRef } from "react";
import Chatuser from "./Chatuser";
import Messages from "./Messages";
import Typesend from "./Typesend";
import useConversation from "../../statemanage/useConversation.js";
import { useAuth } from "../../context/AuthProvider.jsx";
import { useSocketContext } from "../../context/SocketContext.jsx";
import { CiMenuFries } from "react-icons/ci";
import CallModal from "./CallModal";
import useGetAllUsers from "../../context/useGetAllUsers.jsx";

function Right() {
  const { selectedConversation, setSelectedConversation } = useConversation();
  const [searchQuery, setSearchQuery] = useState("");
  const { socket } = useSocketContext();
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const incomingCallRef = useRef(null);
  const [allUsers] = useGetAllUsers(); // Get all users at top level

  // Reset search when conversation changes
  useEffect(() => {
    setSearchQuery("");
  }, [selectedConversation?._id]);

  // Global incoming call handler
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async ({ signalData, from, name, callType }) => {
      console.log("🔔 Global incoming call handler:", { from, name, callType, hasOffer: signalData?.type === "offer", signalData });
      
      // Check if this is a call offer (RTCSessionDescription with type "offer")
      if (signalData && signalData.type === "offer") {
        console.log("✅ Incoming call offer detected, opening CallModal");
        
        // Find the caller user from allUsers
        const caller = allUsers.find(u => u._id === from) || { _id: from, fullname: name || "Unknown", profilePicture: "" };
        
        // Store incoming call info
        incomingCallRef.current = {
          caller: caller,
          signalData: signalData,
          callType: callType || "video",
          from: from
        };
        
        // Open call modal
        setShowIncomingCallModal(true);
        setIncomingCall(incomingCallRef.current);
        
        // Switch to chat with caller if not already selected
        if (!selectedConversation || selectedConversation._id !== from) {
          setSelectedConversation(caller);
        }
        
        console.log("📞 CallModal should open now with:", incomingCallRef.current);
      } else {
        console.log("⚠️ Received callUser event but not an offer:", signalData);
      }
    };

    socket.on("callUser", handleIncomingCall);

    return () => {
      socket.off("callUser", handleIncomingCall);
    };
  }, [socket, selectedConversation, setSelectedConversation, allUsers]);

  return (
    <div className="w-full bg-brown-bg text-brown-text flex flex-col h-screen overflow-hidden">
      {!selectedConversation ? (
        <NoChatSelected />
      ) : (
        <>
          {/* Header - Fixed at top */}
          <div className="flex-shrink-0">
            <Chatuser searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
          {/* Messages area - Scrollable */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Messages searchQuery={searchQuery} />
          </div>
          {/* Input area - Fixed at bottom */}
          <div className="flex-shrink-0">
            <Typesend />
          </div>
        </>
      )}
      
      {/* Incoming Call Modal */}
      {showIncomingCallModal && incomingCall && (
        <CallModal
          isOpen={showIncomingCallModal}
          onClose={() => {
            setShowIncomingCallModal(false);
            setIncomingCall(null);
            incomingCallRef.current = null;
          }}
          callType={incomingCall.callType}
          selectedConversation={incomingCall.caller}
          incomingCall={incomingCall}
        />
      )}
    </div>
  );
}

export default Right;

const NoChatSelected = () => {
  const [authUser] = useAuth();
  console.log(authUser);
  return (
      <div className="flex-1 flex items-center justify-center bg-brown-bg">
      <div className="text-center px-6">
        <div className="mb-6 flex justify-center">
          {/* Custom Chatmate Logo - Two overlapping chat bubbles */}
          <div className="relative">
            <svg viewBox="0 0 120 120" width="180" height="180" className="text-brown-primary">
              {/* Main chat bubble (left, larger) */}
              <path 
                d="M20 40 C20 20, 35 10, 50 10 L70 10 C85 10, 100 20, 100 40 L100 60 C100 75, 90 85, 75 85 L45 85 L20 100 Z" 
                fill="currentColor" 
                opacity="0.8"
              />
              {/* Secondary chat bubble (right, smaller, overlapping) */}
              <path 
                d="M50 55 C50 45, 58 38, 68 38 L83 38 C93 38, 100 45, 100 55 L100 68 C100 78, 93 85, 83 85 L58 85 L50 95 Z" 
                fill="currentColor" 
                opacity="0.6"
              />
              {/* Decorative dot pattern */}
              <circle cx="40" cy="40" r="4" fill="white" opacity="0.3"/>
              <circle cx="60" cy="40" r="4" fill="white" opacity="0.3"/>
              <circle cx="50" cy="50" r="4" fill="white" opacity="0.3"/>
              <circle cx="72" cy="58" r="3" fill="white" opacity="0.3"/>
              <circle cx="85" cy="58" r="3" fill="white" opacity="0.3"/>
            </svg>
          </div>
        </div>
        <h2 className="text-brown-text text-4xl font-bold mb-2">
          Chatmate
        </h2>
        <p className="text-brown-primary text-base mb-6 font-medium">
          BY Roushan Kumar
        </p>
        <p className="text-brown-dark text-sm max-w-md mx-auto leading-relaxed mb-8">
          Send and receive messages in real-time.
          <br />
          Select a chat to start messaging.
        </p>
        <div className="mt-8 text-brown-dark text-xs flex items-center justify-center space-x-1 mb-8">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>End-to-end encrypted</span>
        </div>

        {/* Help Section with Links */}
        <div className="mt-8 pt-8 border-t border-brown-medium">
          <p className="text-brown-dark text-xs mb-4">Need Help? Connect with Developer:</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-brown-primary">
            {/* LinkedIn */}
            <a 
              href="https://www.linkedin.com/in/roushan-kumar-7a4172257/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-brown-primary transition-colors cursor-pointer"
              title="LinkedIn Profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-xs">LinkedIn</span>
            </a>

            {/* Gmail */}
            <a 
              href="mailto:roushankumarydv2003@gmail.com" 
              className="flex items-center gap-2 hover:text-brown-primary transition-colors cursor-pointer"
              title="Email: roushankumarydv2003@gmail.com"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              <span className="text-xs">Gmail</span>
            </a>

            {/* Phone */}
            <a 
              href="tel:9631985460" 
              className="flex items-center gap-2 hover:text-brown-primary transition-colors cursor-pointer"
              title="Phone: 9631985460"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <span className="text-xs">Phone</span>
            </a>

            {/* GitHub */}
            <a 
              href="https://github.com/roushanronny" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-brown-primary transition-colors cursor-pointer"
              title="GitHub Profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-xs">GitHub</span>
            </a>

            {/* Portfolio */}
            <a 
              href="https://roushanronny.github.io/Portfolio-Website/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-brown-primary transition-colors cursor-pointer"
              title="Portfolio Website"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="text-xs">Portfolio</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
