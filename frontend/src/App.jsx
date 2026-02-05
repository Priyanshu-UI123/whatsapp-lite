import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { socket } from "./socket"; 

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import GroupChat from "./pages/GroupChat";
import PersonalChat from "./pages/PersonalChat";
import About from "./pages/About"; 
import GlobalCall from "./components/GlobalCall"; // 👈 IMPORT GLOBAL CALL

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Real-time listener for user data
        const unsubDb = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
             setUserData({ ...docSnap.data(), uid: currentUser.uid });
             setLoading(false);
          } else {
             // Fallback if DB doc doesn't exist yet
             setUserData({
                realName: currentUser.displayName || "User",
                username: currentUser.email.split('@')[0],
                photoURL: currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                uid: currentUser.uid
             });
             setLoading(false);
          }
        }, () => setLoading(false));
        return () => unsubDb();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  if (loading) return <div className="h-screen bg-[#0f172a] text-emerald-400 flex justify-center items-center font-bold animate-pulse">Loading App...</div>;

  return (
    <BrowserRouter>
      {/* 🌍 GLOBAL CALL LISTENER: This makes the call ring ANYWHERE in the app */}
      {userData && <GlobalCall socket={socket} userData={userData} />}

      <div className="h-screen bg-[#0f172a] font-sans text-gray-100 overflow-hidden">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

          <Route path="/" element={user ? <Home userData={userData} socket={socket} /> : <Navigate to="/login" />} />
          
          {/* ✅ CHAT ROUTES */}
          <Route path="/group/:roomId" element={user ? <GroupChat userData={userData} socket={socket} /> : <Navigate to="/login" />} />
          
          {/* Note: In your previous code you used /dm/, but PersonalChat likely expects just the ID. 
              Make sure your links in Home.jsx match this path structure! */}
          <Route path="/dm/:roomId" element={user ? <PersonalChat userData={userData} socket={socket} /> : <Navigate to="/login" />} />
          <Route path="/chat/:roomId" element={user ? <PersonalChat userData={userData} socket={socket} /> : <Navigate to="/login" />} />
          
          {/* ✅ PAGES */}
          <Route path="/profile" element={user ? <Profile userData={userData} /> : <Navigate to="/login" />} />
          <Route path="/about" element={user ? <About /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;