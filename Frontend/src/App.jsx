import React from "react";
import Left from "./home/Leftpart/Left";
import Right from "./home/Rightpart/Right";
import Signup from "./components/Signup";
import Login from "./components/Login";
import { useAuth } from "./context/AuthProvider";
import { Toaster } from "react-hot-toast";
import Logout from "./home/left1/Logout";
import { useView } from "./context/ViewContext";
import CallsView from "./home/views/CallsView";
import StatusView from "./home/views/StatusView";
import StarredView from "./home/views/StarredView";
import SettingsView from "./home/views/SettingsView";

import { Navigate, Route, Routes } from "react-router-dom";

function MainLayout() {
  const { activeView } = useView();
  
  return (
    <div className="flex h-screen">
      <Logout />
      {activeView === "chats" && <Left />}
      {activeView === "chats" && <Right />}
      {activeView === "calls" && <CallsView />}
      {activeView === "status" && <StatusView />}
      {activeView === "starred" && <StarredView />}
      {activeView === "settings" && <SettingsView />}
      {activeView === "communities" && (
        <div className="w-full bg-[#0B141A] flex items-center justify-center text-[#8696A0]">
          Communities feature coming soon
        </div>
      )}
    </div>
  );
}

function App() {
  const [authUser, setAuthUser] = useAuth();
  console.log(authUser);
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
          element={authUser ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/signup"
          element={authUser ? <Navigate to="/" /> : <Signup />}
        />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;