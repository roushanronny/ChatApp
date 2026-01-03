import { create } from "zustand";

const useConversation = create((set) => ({
  selectedConversation: null,
  setSelectedConversation: (selectedConversation) =>
    set({ selectedConversation }),
  messages: [],
  setMessage: (messagesOrUpdater) => {
    // Support both direct value and functional updates
    if (typeof messagesOrUpdater === 'function') {
      // Functional update
      set((state) => {
        const currentMessages = Array.isArray(state.messages) ? state.messages : [];
        const updatedMessages = messagesOrUpdater(currentMessages);
        const messagesArray = Array.isArray(updatedMessages) ? updatedMessages : [];
        return { messages: messagesArray };
      });
    } else {
      // Direct value update
      const messagesArray = Array.isArray(messagesOrUpdater) ? messagesOrUpdater : [];
      set({ messages: messagesArray });
    }
  },
}));
export default useConversation;
