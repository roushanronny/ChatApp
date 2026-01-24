import React from "react";
import Left from "./home/Leftpart/Left";
import Right from "./home/Rightpart/Right";
import Auth from "./components/Auth";
import { useAuth } from "./context/AuthProvider";
import { Toaster } from "react-hot-toast";
import Logout from "./home/left1/Logout";
import { useView } from "./context/ViewContext";
import CallsView from "./home/views/CallsView";
import StatusView from "./home/views/StatusView";
import StarredView from "./home/views/StarredView";
import SettingsView from "./home/views/SettingsView";
import ArchivedView from "./home/views/ArchivedView";

import { Navigate, Route, Routes } from "react-router-dom";

function MainLayout() {
  const { activeView } = useView();
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Logout />
      {activeView === "chats" && (
        <>
          <Left />
          <Right />
        </>
      )}
      {activeView === "calls" && <CallsView />}
      {activeView === "status" && <StatusView />}
      {activeView === "starred" && <StarredView />}
      {activeView === "settings" && <SettingsView />}
      {activeView === "archived" && <ArchivedView />}
      {activeView === "communities" && (
        <div className="w-full bg-brown-bg flex items-center justify-center text-brown-dark">
          Communities feature coming soon
        </div>
      )}
    </div>
  );
}

function App() {
  const [authUser, setAuthUser] = useAuth();
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            authUser ? (
              <MainLayout />
            ) : (
              <Navigate to={"/login"} />
            )
          }
        />
        <Route
          path="/login"
          element={authUser ? <Navigate to="/" /> : <Auth />}
        />
        <Route
          path="/signup"
          element={authUser ? <Navigate to="/" /> : <Auth />}
        />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;