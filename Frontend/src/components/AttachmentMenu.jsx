import React from "react";
import { FaFile, FaImage, FaAddressCard, FaPoll, FaCalendar, FaRobot } from "react-icons/fa";

function AttachmentMenu({ onClose, onSelect }) {
  const options = [
    { icon: FaFile, label: "File", action: "file" },
    { icon: FaImage, label: "Photos & Videos", action: "media" },
    { icon: FaAddressCard, label: "Contact", action: "contact" },
    { icon: FaPoll, label: "Poll", action: "poll" },
    { icon: FaCalendar, label: "Event", action: "event" },
    { icon: FaRobot, label: "AI Images", action: "ai" },
  ];

  const handleClick = (action) => {
    if (onSelect) onSelect(action);
    if (onClose) onClose();
  };

  return (
    <div 
      className="absolute bottom-16 left-4 bg-[#233138] rounded-lg shadow-2xl z-50 min-w-[200px] py-2"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, index) => {
        const Icon = option.icon;
        return (
          <button
            key={index}
            onClick={() => handleClick(option.action)}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#182229] text-white text-sm transition"
          >
            <Icon className="text-lg text-[#8696A0]" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AttachmentMenu;

