import React from "react";

function MessageContextMenu({ message, position, onClose, onAction }) {
  const handleAction = (e, action) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("MessageContextMenu handleAction:", action, message?._id);
    
    if (!onAction) {
      console.error("onAction handler not provided");
      if (onClose) onClose();
      return;
    }
    
    if (!message || !message._id) {
      console.error("Message or message._id is missing:", message);
      if (onClose) onClose();
      return;
    }
    
    // Call the action handler immediately
    try {
      onAction(action, message);
    } catch (error) {
      console.error("Error in onAction handler:", error);
    }
    
    // Close menu after a small delay
    if (onClose) {
      setTimeout(() => {
        onClose();
      }, 50);
    }
  };

  // Ensure menu stays within viewport
  const getPosition = () => {
    const menuWidth = 180;
    const menuHeight = 250;
    const padding = 10;
    let x = position.x;
    let y = position.y;

    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Adjust if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = position.y - menuHeight;
    }

    // Ensure menu doesn't go off left or top edge
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  };

  const adjustedPosition = getPosition();

  return (
    <div
      className="context-menu fixed bg-[#233138] rounded-lg shadow-2xl z-[9999] min-w-[180px] py-2"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction(e, "reply");
        }}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition cursor-pointer"
      >
        Reply
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction(e, "react");
        }}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition cursor-pointer"
      >
        React
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction(e, "forward");
        }}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition cursor-pointer"
      >
        Forward
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction(e, "star");
        }}
        className="w-full text-left px-4 py-2 text-white text-sm hover:bg-[#182229] transition cursor-pointer"
      >
        {message?.isStarred ? "Unstar" : "Star"}
      </button>
      <div className="border-t border-[#313D45] my-1"></div>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction(e, "delete");
        }}
        className="w-full text-left px-4 py-2 text-red-500 text-sm hover:bg-[#182229] transition cursor-pointer"
      >
        Delete
      </button>
    </div>
  );
}

export default MessageContextMenu;

