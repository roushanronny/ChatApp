import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { FaPaperclip, FaSmile, FaMicrophone, FaTimes } from "react-icons/fa";
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
  const [replyTo, setReplyTo] = useState(null);
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

  // Listen for reply message event
  useEffect(() => {
    const handleSetReply = (event) => {
      setReplyTo(event.detail);
      // Focus on input field
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Type a message"]');
        if (input) input.focus();
      }, 100);
    };

    window.addEventListener('setReplyMessage', handleSetReply);
    return () => window.removeEventListener('setReplyMessage', handleSetReply);
  }, []);

  // Clear reply when conversation changes
  useEffect(() => {
    setReplyTo(null);
  }, [selectedConversation?._id]);

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
    setShowAttachmentMenu(false); // Close menu first
    switch (action) {
      case "file":
        setTimeout(() => generalFileInputRef.current?.click(), 100);
        break;
      case "media":
        setTimeout(() => mediaInputRef.current?.click(), 100);
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
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, file.type, file.size);

    // Auto-detect file type if not provided
    let detectedType = type;
    if (!type || type === "file") {
      if (file.type.startsWith("image/")) {
        detectedType = "image";
      } else if (file.type.startsWith("video/")) {
        detectedType = "video";
      } else if (file.type.startsWith("audio/")) {
        detectedType = "audio";
      } else {
        detectedType = "file";
      }
    }

    setSelectedFile(file);
    setFileType(detectedType);

    // Create preview for images and videos
    if (detectedType === "image" || detectedType === "video") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
        console.log("File preview created for:", detectedType);
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast.error("Error reading file");
      };
      reader.readAsDataURL(file);
    } else {
      // For files and audio, set a placeholder or file name
      setFilePreview(null);
      console.log("File type:", detectedType, "No preview needed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message && !selectedFile && !filePreview && !isRecording) {
      return;
    }

    if (!selectedConversation) {
      toast.error("Please select a conversation");
      return;
    }

    try {
      if (selectedFile || filePreview) {
        let base64ToSend = filePreview;
        
        // If no preview but file is selected, read it
        if (!base64ToSend && selectedFile) {
          console.log("Reading file as base64:", selectedFile.name, selectedFile.type);
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              base64ToSend = reader.result;
              console.log("File read successfully, length:", base64ToSend?.length);
              await sendFileMessage(base64ToSend);
            } catch (error) {
              console.error("Error in sendFileMessage:", error);
              toast.error("Failed to send file: " + (error.response?.data?.error || error.message));
            }
          };
          reader.onerror = (error) => {
            console.error("Error reading file:", error);
            toast.error("Error reading file");
          };
          reader.readAsDataURL(selectedFile);
          return; // Return early, will continue in reader.onloadend
        }
        
        // Send if we have the data
        if (base64ToSend) {
          console.log("Sending file with preview, type:", fileType);
          await sendFileMessage(base64ToSend);
        } else {
          toast.error("No file data to send");
        }
      } else if (message.trim()) {
        await sendMessages(message, "text", "", replyTo?._id);
        setMessage("");
        setReplyTo(null); // Clear reply after sending
      }
      
      if (socket && selectedConversation) {
        socket.emit("stopTyping", {
          receiverId: selectedConversation._id,
          senderId: JSON.parse(localStorage.getItem("ChatApp")).user._id,
        });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("Failed to send: " + (error.response?.data?.error || error.message));
    }
  };

  const sendFileMessage = async (base64Data) => {
    if (!base64Data) {
      toast.error("No file data to send");
      return;
    }

    if (!selectedConversation) {
      toast.error("Please select a conversation");
      return;
    }

    try {
      console.log("Sending file:", fileType, "Length:", base64Data?.length);
      
      // Validate base64 data
      if (base64Data.length < 100) {
        toast.error("File data is too small or invalid");
        return;
      }

      await sendMessages("", fileType, base64Data, replyTo?._id);
      
      toast.success(`${fileType === "image" ? "Image" : fileType === "video" ? "Video" : fileType === "audio" ? "Audio" : "File"} sent successfully`);
      
      // Reset file state
      setSelectedFile(null);
      setFilePreview(null);
      setFileType("text");
      setReplyTo(null); // Clear reply after sending
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (mediaInputRef.current) mediaInputRef.current.value = "";
      if (generalFileInputRef.current) generalFileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending file:", error);
      toast.error("Failed to send file: " + (error.response?.data?.error || error.message));
      throw error; // Re-throw to handle in handleSubmit
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
    if (!selectedConversation) {
      toast.error("Please select a conversation");
      return;
    }

    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log("Microphone access granted");
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        console.warn("audio/webm not supported, trying default");
      }
      
      const options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to default
        delete options.mimeType;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("Audio chunk received:", event.data.size, "bytes");
        }
      };

      mediaRecorderRef.current.onerror = (error) => {
        console.error("MediaRecorder error:", error);
        toast.error("Error recording audio");
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Recording stopped, chunks:", audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          toast.error("No audio recorded");
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          console.log("Audio blob created:", audioBlob.size, "bytes");
          
          if (audioBlob.size < 100) {
            toast.error("Recording too short");
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              console.log("Sending audio message, base64 length:", reader.result?.length);
              await sendMessages("", "audio", reader.result);
              toast.success("Voice message sent");
            } catch (error) {
              console.error("Error sending audio:", error);
              toast.error("Failed to send voice message: " + (error.response?.data?.error || error.message));
            }
          };
          reader.onerror = (error) => {
            console.error("Error reading audio blob:", error);
            toast.error("Error processing audio");
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error("Error creating audio blob:", error);
          toast.error("Error processing audio");
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log("Recording started");
      toast.success("Recording...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        toast.error("No microphone found");
      } else {
        toast.error("Error accessing microphone: " + error.message);
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          console.log("Recording stopped");
        }
        setIsRecording(false);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setIsRecording(false);
      }
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

  const removeReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="bg-[#202C33] border-t border-[#313D45] relative">
      {replyTo && (
        <div className="bg-[#2A3942] px-4 py-2 mx-3 mb-2 rounded-lg border-l-4 border-[#00A884] flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[#00A884] text-xs font-medium mb-0.5">
              Replying to {replyTo.senderId?.fullname || "message"}
            </div>
            <div className="text-[#8696A0] text-xs truncate">
              {replyTo.messageType === "image" ? "📷 Image" : 
               replyTo.messageType === "video" ? "🎥 Video" :
               replyTo.messageType === "audio" ? "🎤 Audio" :
               replyTo.message || "Message"}
            </div>
          </div>
          <button
            onClick={removeReply}
            className="ml-2 text-[#8696A0] hover:text-white transition"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {(filePreview || selectedFile) && (
        <div className="relative bg-[#202C33] p-3 mx-3 mb-2 rounded-lg border border-[#313D45]">
          <button
            onClick={removeFile}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 z-10"
          >
            ×
          </button>
          {filePreview && fileType === "image" ? (
            <img src={filePreview} alt="Preview" className="max-h-40 rounded-lg w-full object-contain" />
          ) : filePreview && fileType === "video" ? (
            <video src={filePreview} className="max-h-40 rounded-lg w-full" controls />
          ) : selectedFile ? (
            <div className="flex items-center space-x-3 p-2">
              <div className="w-12 h-12 bg-[#313D45] rounded-lg flex items-center justify-center">
                <FaFile className="text-2xl text-[#8696A0]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-[#8696A0] text-xs">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
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
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const type = file.type.startsWith("video/") ? "video" : "image";
                  handleFileSelect(e, type);
                }
                // Reset input to allow selecting same file again
                e.target.value = "";
              }}
            />
            
            <input
              type="file"
              className="hidden"
              ref={generalFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e, "file");
                }
                // Reset input to allow selecting same file again
                e.target.value = "";
              }}
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
          
          {(message || selectedFile || filePreview) && !isRecording ? (
            <button
              type="submit"
              disabled={loading}
              className="p-3 text-[#8696A0] hover:bg-[#313D45] rounded-full transition disabled:opacity-50"
              title="Send"
            >
              <IoSend className="text-xl" />
            </button>
          ) : isRecording ? (
            <button
              type="button"
              disabled
              className="p-3 text-red-500 rounded-full transition"
              title="Recording..."
            >
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseLeave}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
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
