import React from "react";

function CallsView() {
  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen">
      <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
        <h1 className="font-semibold text-lg text-white">Calls</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg viewBox="0 0 24 24" width="100" height="100" fill="#8696A0" opacity="0.4">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
          </div>
          <h2 className="text-[#E9EDEF] text-xl font-light mb-2">No Calls Yet</h2>
          <p className="text-[#8696A0] text-sm">
            Your call history will appear here
          </p>
        </div>
      </div>
    </div>
  );
}

export default CallsView;

