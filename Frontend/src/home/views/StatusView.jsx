import React, { useState } from "react";
import { FaCamera, FaPencilAlt } from "react-icons/fa";

function StatusView() {
  const [selectedStatus, setSelectedStatus] = useState(null);

  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex h-screen">
      {/* Left Panel - Status List */}
      <div className="w-[30%] bg-[#111B21] flex flex-col border-r border-[#313D45]">
        <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg text-white">Updates</h1>
            <div className="flex items-center space-x-2">
              <button className="text-[#8696A0] hover:text-white transition">
                <FaCamera className="text-xl" />
              </button>
              <button className="text-[#8696A0] hover:text-white transition">
                <FaPencilAlt className="text-lg" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="bg-[#202C33] px-4 py-2 border-b border-[#313D45]">
          <div className="flex items-center bg-[#2A3942] rounded-lg px-3 py-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696A0">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Q Search"
              className="bg-transparent text-white placeholder-[#8696A0] ml-3 flex-1 outline-none"
            />
          </div>
        </div>

        {/* Status Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#313D45]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#8696A0] text-sm font-medium uppercase">Status</h2>
              <div className="flex items-center space-x-2">
                <button className="text-[#00A884] hover:text-[#00B894] transition">
                  <FaCamera className="text-sm" />
                </button>
                <button className="text-[#8696A0] hover:text-white transition">
                  <FaPencilAlt className="text-xs" />
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-[#2A3942] border-2 border-[#00A884] flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full bg-[#202C33] flex items-center justify-center">
                  <FaCamera className="text-[#8696A0]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00A884] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-white text-sm font-medium">My status</h3>
                <p className="text-[#8696A0] text-xs">Tap to add status update</p>
              </div>
            </div>
          </div>

          {/* No status updates message */}
          <div className="px-4 py-8 text-center">
            <p className="text-[#8696A0] text-sm">No status updates from your contacts</p>
          </div>
        </div>
      </div>

      {/* Right Panel - My Status Details */}
      <div className="flex-1 bg-[#0B141A] flex flex-col">
        <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
          <h2 className="font-semibold text-lg text-white">My status</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-32 h-32 rounded-full bg-[#2A3942] border-2 border-[#00A884] flex items-center justify-center mb-6 relative">
            <div className="w-28 h-28 rounded-full bg-[#202C33] flex items-center justify-center">
              <FaCamera className="text-4xl text-[#8696A0]" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
          </div>
          <h3 className="text-white text-xl mb-2">My status</h3>
          <p className="text-[#8696A0] text-sm text-center mb-8 max-w-md">
            Updates created on your phone will appear here
          </p>
          <div className="w-full max-w-md bg-[#202C33] rounded-lg px-4 py-3 flex items-center justify-between">
            <button className="flex items-center space-x-3 text-white hover:text-[#00A884] transition">
              <FaCamera className="text-xl" />
              <span className="text-sm font-medium">Camera</span>
            </button>
            <div className="w-px h-6 bg-[#313D45]"></div>
            <button className="flex items-center space-x-3 text-white hover:text-[#00A884] transition">
              <FaPencilAlt className="text-lg" />
              <span className="text-sm font-medium">Text</span>
            </button>
          </div>
          <div className="mt-8 flex items-center space-x-1 text-[#667781] text-xs">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            <span>Your status updates are end-to-end encrypted. They will disappear after 24 hours.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusView;

