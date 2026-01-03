import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { FaPaperclip, FaSmile, FaMicrophone } from "react-icons/fa";
import useSendMessage from "../../context/useSendMessage.js";
import { useSocketContext } from "../../context/SocketContext.jsx";
import useConversation from "../../statemanage/useConversation.js";
import AttachmentMenu from "../../components/AttachmentMenu.jsx";
import toast from "react-hot-toast";

function Typesend() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("text");
  const [filePreview, setFilePreview] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { loading, sendMessages } = useSendMessage();
  const { socket } = useSocketContext();
  const { selectedConversation } = useConversation();
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const generalFileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = () => {
    if (!socket || !selectedConversation) return;
    
    socket.emit("typing", {
      receiverId: selectedConversation._id,
      senderId: JSON.parse(localStorage.getItem("ChatApp")).user._id,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        receiverId: selectedConversation._id,
        senderId: JSON.parse(localStorage.getItem("ChatApp")).user._id,
      });
    }, 3000);
  };

  const handleAttachmentSelect = (action) => {
    switch (action) {
      case "file":
        generalFileInputRef.current?.click();
        break;
      case "media":
        mediaInputRef.current?.click();
        break;
      case "contact":
        toast.info("Contact sharing feature coming soon!");
        break;
      case "poll":
        toast.info("Poll feature coming soon!");
        break;
      case "event":
        toast.info("Event feature coming soon!");
        break;
      case "ai":
        toast.info("AI Images feature coming soon!");
        break;
      default:
        break;
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setFileType(type);

    if (type === "image" || type === "video") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (type === "file") {
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message && !selectedFile && !isRecording) return;

    try {
      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64String = reader.result;
            await sendMessages("", fileType, base64String);
            setSelectedFile(null);
            setFilePreview(null);
            setFileType("text");
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (mediaInputRef.current) mediaInputRef.current.value = "";
            if (generalFileInputRef.current) generalFileInputRef.current.value = "";
          } catch (error) {
            console.error("Error sending file:", error);
            toast.error("Failed to send file");
          }
        };
        reader.onerror = () => {
          console.error("Error reading file");
          toast.error("Error reading file");
        };
        reader.readAsDataURL(selectedFile);
      } else {
        await sendMessages(message, "text", "");
        setMessage("");
      }
      
      if (socket && selectedConversation) {
        socket.emit("stopTyping", {
          receiverId: selectedConversation._id,
          senderId: JSON.parse(localStorage.getItem("ChatApp")).user._id,
        });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await sendMessages("", "audio", reader.result);
            toast.success("Voice message sent");
          } catch (error) {
            console.error("Error sending audio:", error);
            toast.error("Failed to send voice message");
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicMouseDown = () => {
    if (!isRecording) {
      startRecording();
    }
  };

  const handleMicMouseUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType("text");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mediaInputRef.current) mediaInputRef.current.value = "";
    if (generalFileInputRef.current) generalFileInputRef.current.value = "";
  };

  // Common emojis
  const commonEmojis = ["😀", "😂", "😍", "😊", "😎", "😭", "❤️", "👍", "👎", "🎉", "🔥", "💯"];

  return (
    <div className="bg-[#202C33] border-t border-[#313D45] relative">
      {filePreview && (
        <div className="relative bg-[#202C33] p-3 mx-3 mb-2 rounded-lg border border-[#313D45]">
          <button
            onClick={removeFile}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
          {fileType === "image" ? (
            <img src={filePreview} alt="Preview" className="max-h-40 rounded-lg" />
          ) : fileType === "video" ? (
            <video src={filePreview} className="max-h-40 rounded-lg" controls />
          ) : null}
        </div>
      )}
      
      {showAttachmentMenu && (
        <div ref={attachmentMenuRef}>
          <AttachmentMenu 
            onClose={() => setShowAttachmentMenu(false)}
            onSelect={handleAttachmentSelect}
          />
        </div>
      )}

      {showEmojiPicker && (
        <div className="emoji-picker-container absolute bottom-16 left-16 bg-[#233138] rounded-lg shadow-2xl z-50 p-3 grid grid-cols-6 gap-2 max-w-[250px]">
          {commonEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:bg-[#182229] rounded p-2 transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="px-4 py-2">
        <div className="flex items-end space-x-2">
          <div className="flex items-center space-x-1 relative">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2 text-[#8696A0] hover:bg-[#313D45] rounded-full transition"
              title="Attach"
            >
              <FaPaperclip className="text-xl rotate-45" />
            </button>
            
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              ref={mediaInputRef}
              onChange={(e) => handleFileSelect(e, e.target.files[0]?.type.startsWith("video/") ? "video" : "image")}
            />
            
            <input
              type="file"
              className="hidden"
              ref={generalFileInputRef}
              onChange={(e) => handleFileSelect(e, "file")}
            />
          </div>
          
          <div className="flex-1 flex items-center bg-[#2A3942] rounded-lg px-3 py-2">
            <input
              type="text"
              placeholder="Type a message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent text-white placeholder-[#8696A0] outline-none text-sm"
            />
            <button 
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-[#8696A0] hover:bg-[#313D45] rounded-full transition"
              title="Emoji"
            >
              <FaSmile className="text-xl" />
            </button>
          </div>
          
          {message || selectedFile ? (
            <button
              type="submit"
              disabled={loading}
              className="p-3 text-[#8696A0] hover:bg-[#313D45] rounded-full transition disabled:opacity-50"
              title="Send"
            >
              <IoSend className="text-xl" />
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseUp}
              className={`p-3 rounded-full transition ${
                isRecording 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "text-[#8696A0] hover:bg-[#313D45]"
              }`}
              title={isRecording ? "Recording... Release to send" : "Hold to record"}
            >
              <FaMicrophone className="text-xl" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default Typesend;
