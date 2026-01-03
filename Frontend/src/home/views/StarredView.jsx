import React from "react";

function StarredView() {
  return (
    <div className="w-full bg-[#0B141A] text-gray-300 flex flex-col h-screen">
      <div className="bg-[#202C33] px-4 py-3 border-b border-[#313D45]">
        <h1 className="font-semibold text-lg text-white">Starred Messages</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg viewBox="0 0 24 24" width="100" height="100" fill="#8696A0" opacity="0.4">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <h2 className="text-[#E9EDEF] text-xl font-light mb-2">No Starred Messages</h2>
          <p className="text-[#8696A0] text-sm">
            Messages you star will appear here
          </p>
        </div>
      </div>
    </div>
  );
}

export default StarredView;

