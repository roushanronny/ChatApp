import React from "react";

function MessageContextMenu({ message, position, onClose, onAction }) {
  const handleAction = (action) => {
    if (onAction) onAction(action, message);
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed bg-[#233138] rounded-lg shadow-2xl z-50 min-w-[180px] py-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => handleAction("reply")}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition"
      >
        Reply
      </button>
      <button
        onClick={() => handleAction("react")}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition"
      >
        React
      </button>
      <button
        onClick={() => handleAction("forward")}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition"
      >
        Forward
      </button>
      <button
        onClick={() => handleAction("star")}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition"
      >
        Star
      </button>
      <div className="border-t border-[#313D45] my-1"></div>
      <button
        onClick={() => handleAction("delete")}
        className="w-full text-left px-4 py-2 text-red-500 text-sm hover:bg-[#182229] transition"
      >
        Delete
      </button>
    </div>
  );
}

export default MessageContextMenu;

