import React, { createContext, useContext, useState } from "react";

const ViewContext = createContext();

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within ViewProvider");
  }
  return context;
};

export const ViewProvider = ({ children }) => {
  const [activeView, setActiveView] = useState("chats");

  return (
    <ViewContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </ViewContext.Provider>
  );
};

