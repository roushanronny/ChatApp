import React from "react";

function ContextMenu({ x, y, onClose, onPin, onMute, onArchive, onDelete }) {
  const options = [
    { label: "Pin Chat", action: onPin },
    { label: "Mute", action: onMute },
    { label: "Archive", action: onArchive },
    { label: "Delete", action: onDelete, danger: true },
  ];

  const handleClick = (action) => {
    if (action) action();
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed bg-[#233138] rounded-lg shadow-2xl z-50 min-w-[180px] py-2"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => handleClick(option.action)}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-[#182229] transition ${
            option.danger ? "text-red-400" : "text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ContextMenu;

