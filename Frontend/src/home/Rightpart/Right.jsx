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

  // Reset search when conversation changes
  useEffect(() => {
    setSearchQuery("");
  }, [selectedConversation?._id]);

  // Global incoming call handler
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async ({ signalData, from, name, callType }) => {
      console.log("Global incoming call handler:", { from, name, callType, hasOffer: signalData?.type === "offer" });
      
      // Check if this is a call offer (RTCSessionDescription with type "offer")
      if (signalData && signalData.type === "offer") {
        console.log("Incoming call offer detected, opening CallModal");
        
        // Find the caller user
        const [allUsers] = useGetAllUsers();
        const caller = allUsers.find(u => u._id === from) || { _id: from, fullname: name || "Unknown" };
        
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
      }
    };

    socket.on("callUser", handleIncomingCall);

    return () => {
      socket.off("callUser", handleIncomingCall);
    };
  }, [socket, selectedConversation, setSelectedConversation]);

  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen overflow-hidden">
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
          incomingCall={incomingCall.signalData}
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
    <div className="flex-1 flex items-center justify-center bg-[#0B141A]">
      <div className="text-center">
        <div className="mb-4">
          <svg viewBox="0 0 24 24" width="200" height="200" fill="#8696A0" opacity="0.4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>
        <h2 className="text-[#E9EDEF] text-2xl font-light mb-2">
          WhatsApp Web
        </h2>
        <p className="text-[#8696A0] text-sm max-w-md mx-auto leading-relaxed">
          Send and receive messages without keeping your phone online.
          <br />
          Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
        </p>
        <div className="mt-6 text-[#667781] text-xs flex items-center justify-center space-x-1">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};
