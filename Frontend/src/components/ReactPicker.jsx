import React from "react";

const EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "👏"];

function ReactPicker({ position, onClose, onSelect, currentReaction }) {
  // Ensure picker stays within viewport
  const getPosition = () => {
    const pickerWidth = 250;
    const pickerHeight = 60;
    const padding = 10;
    let x = position.x;
    let y = position.y;

    // Adjust if picker would go off right edge
    if (x + pickerWidth > window.innerWidth) {
      x = window.innerWidth - pickerWidth - padding;
    }

    // Adjust if picker would go off bottom edge
    if (y + pickerHeight > window.innerHeight) {
      y = position.y - pickerHeight - 40;
    }

    // Ensure picker doesn't go off left or top edge
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  };

  const adjustedPosition = getPosition();

  return (
    <div
      className="react-picker fixed bg-[#233138] rounded-lg shadow-2xl z-[9999] py-2 px-2 flex gap-2"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {EMOJIS.map((emoji, idx) => (
        <button
          key={idx}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className={`text-2xl px-2 py-1 rounded-lg hover:bg-[#182229] transition ${
            currentReaction === emoji ? "bg-[#182229]" : ""
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default ReactPicker;

