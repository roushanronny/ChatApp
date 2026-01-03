import React from "react";

function Loading() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#667781] border-t-[#25D366] rounded-full animate-spin"></div>
        </div>
        <p className="text-[#667781] text-sm">Loading messages...</p>
      </div>
    </div>
  );
}

export default Loading;
