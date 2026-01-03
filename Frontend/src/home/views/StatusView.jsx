import React from "react";

function StatusView() {
  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen">
      <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
        <h1 className="font-semibold text-lg text-white">Status</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg viewBox="0 0 24 24" width="100" height="100" fill="#8696A0" opacity="0.4">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h2 className="text-[#E9EDEF] text-xl font-light mb-2">No Status Updates</h2>
          <p className="text-[#8696A0] text-sm">
            Status updates from your contacts will appear here
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatusView;

