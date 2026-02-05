import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";

// 📱 MOBILE ACTION MODAL
const MobileActions = ({ onClose, onJoin, onSearch, userData }) => {
    const [tab, setTab] = useState("search"); // 'search' or 'join'
    const [queryTxt, setQueryTxt] = useState("");
    const [roomTxt, setRoomTxt] = useState("");
    const [result, setResult] = useState(null);

    const handleSearch = async () => {
        if(!queryTxt) return;
        const q = query(collection(db, "users"), where("username", "==", queryTxt.toLowerCase()));
        const snap = await getDocs(q);
        if(!snap.empty) setResult(snap.docs[0].data());
        else alert("User not found");
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
            <div className="bg-[#1e293b] w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 border-t sm:border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold text-lg">New Chat</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl mb-6">
                    <button onClick={() => setTab("search")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab==="search" ? "bg-emerald-600 text-white shadow-lg" : "text-gray-400"}`}>Private DM</button>
                    <button onClick={() => setTab("join")} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab==="join" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400"}`}>Group Chat</button>
                </div>

                {tab === "search" ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Username..." className="flex-1 bg-black/30 text-white p-3 rounded-xl outline-none border border-white/10"
                                onChange={(e)=>setQueryTxt(e.target.value)} />
                            <button onClick={handleSearch} className="bg-emerald-600 p-3 rounded-xl text-white">🔍</button>
                        </div>
                        {result && (
                            <div onClick={() => onSearch(result)} className="bg-white/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer border border-emerald-500/50">
                                <img src={result.photoURL} className="w-10 h-10 rounded-full"/>
                                <div><p className="text-white font-bold">{result.realName}</p><p className="text-xs text-gray-400">@{result.username}</p></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                         <input type="text" placeholder="Enter Room ID..." className="w-full bg-black/30 text-white p-3 rounded-xl outline-none border border-white/10"
                                onChange={(e)=>setRoomTxt(e.target.value)} />
                         <button onClick={() => onJoin(roomTxt)} className="w-full bg-blue-600 py-3 rounded-xl text-white font-bold shadow-lg">Join Room</button>
                    </div>
                )}
            </div>
        </div>
    );
};

function Home({ userData, socket }) {
  if (!userData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-emerald-400 font-bold animate-pulse">Loading...</div>;

  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Desktop States
  const [room, setRoom] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  useEffect(() => {
    if (userData.uid) {
      const unsub = onSnapshot(doc(db, "userChats", userData.uid), (doc) => {
        if (doc.exists()) {
           const data = doc.data();
           const chatList = Object.entries(data).map(([roomId, chatData]) => ({ roomId, ...chatData })).sort((a,b) => b.date - a.date);
           setChats(chatList);
        }
      });
      return () => unsub();
    }
  }, [userData.uid]);

  const handleLogout = async () => { await signOut(auth); };

  const joinRoom = (roomID) => {
    if (roomID) {
      socket.emit("join_room", { room: roomID, username: userData.realName, photo: userData.photoURL });
      navigate(`/group/${roomID}`);
    }
  };

  const startDirectChat = (targetUser) => {
    if (targetUser) {
      const myUid = userData.uid;
      const theirUid = targetUser.uid;
      const roomID = myUid < theirUid ? `${myUid}_${theirUid}` : `${theirUid}_${myUid}`;
      socket.emit("join_room", { room: roomID, username: userData.realName, photo: userData.photoURL });
      navigate(`/dm/${roomID}`);
    }
  };

  const handleDesktopSearch = async () => {
    if(!searchUsername) return;
    const q = query(collection(db, "users"), where("username", "==", searchUsername.toLowerCase()));
    const snap = await getDocs(q);
    if(!snap.empty) setSearchResult(snap.docs[0].data());
  };

  const openRecentChat = async (chat) => {
      try { await updateDoc(doc(db, "userChats", userData.uid), { [`${chat.roomId}.unread`]: false }); } catch (e) {}
      socket.emit("join_room", { room: chat.roomId, username: userData.realName, photo: userData.photoURL });
      if (chat.roomId.includes("_")) navigate(`/dm/${chat.roomId}`);
      else navigate(`/group/${chat.roomId}`);
  };

  return (
    <div className="h-[100dvh] bg-[#0f172a] flex items-center justify-center font-sans overflow-hidden">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>

      {/* CONTAINER */}
      <div className="w-full md:max-w-5xl h-full md:h-[90vh] bg-gray-900/60 md:backdrop-blur-xl md:border border-white/10 md:rounded-3xl shadow-2xl flex relative z-10">
        
        {/* 👈 LEFT SIDEBAR (VISIBLE ON MOBILE) */}
        <div className="w-full md:w-[350px] bg-black/20 border-r border-white/5 flex flex-col h-full">
            
            {/* Header */}
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/profile")}>
                    <img src={userData.photoURL} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-500 object-cover" />
                    <div>
                        <h2 className="text-white font-bold text-base md:text-lg">{userData.realName}</h2>
                        <p className="text-emerald-400 text-[10px] md:text-xs font-medium tracking-wide">ONLINE</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {/* 📱 MOBILE PLUS BUTTON */}
                    <button onClick={() => setShowMobileMenu(true)} className="md:hidden bg-emerald-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition">
                        <span className="text-xl font-bold mb-0.5">+</span>
                    </button>
                    
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {chats.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 opacity-60">
                        <p className="text-sm">No chats yet.</p>
                        <p className="text-xs">Tap + to start.</p>
                    </div>
                )}
                {chats.map((chat) => (
                    <div key={chat.roomId} onClick={() => openRecentChat(chat)} 
                         className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border ${chat.unread ? 'bg-white/10 border-emerald-500/50' : 'border-transparent hover:bg-white/5'}`}>
                        <div className="relative">
                            <img src={chat.userInfo.photoURL} className={`w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ${chat.unread ? 'ring-2 ring-emerald-400' : ''}`} />
                            {chat.unread && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className={`font-semibold text-sm truncate ${chat.unread ? 'text-white' : 'text-gray-300'}`}>{chat.userInfo.displayName}</h4>
                                <span className="text-[10px] text-gray-500">{new Date(chat.date?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className={`text-xs truncate ${chat.unread ? 'text-emerald-300 font-medium' : 'text-gray-500'}`}>{chat.lastMessage}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 👉 RIGHT MAIN AREA (DESKTOP ONLY) */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">WhatsApp Lite</h1>
            
            {/* Desktop Search */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl w-full max-w-md mt-8">
                <h3 className="text-emerald-400 text-sm font-bold uppercase mb-4">Start Chat</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Username..." className="flex-1 bg-black/40 text-white p-3 rounded-lg outline-none" onChange={(e)=>setSearchUsername(e.target.value)}/>
                    <button onClick={handleDesktopSearch} className="bg-emerald-600 px-4 rounded-lg font-bold">Find</button>
                </div>
                {searchResult && (
                    <div onClick={() => startDirectChat(searchResult)} className="bg-white/10 p-2 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-emerald-900/50">
                        <img src={searchResult.photoURL} className="w-10 h-10 rounded-full"/>
                        <p className="font-bold text-white">{searchResult.realName}</p>
                    </div>
                )}
                <div className="my-6 border-t border-white/10"></div>
                <div className="flex gap-2">
                     <input type="text" placeholder="Room ID..." className="flex-1 bg-black/40 text-white p-3 rounded-lg outline-none" onChange={(e)=>setRoom(e.target.value)}/>
                     <button onClick={() => joinRoom(room)} className="bg-blue-600 px-4 rounded-lg font-bold">Join</button>
                </div>
            </div>
        </div>
      </div>

      {/* MOBILE MODAL */}
      {showMobileMenu && <MobileActions onClose={() => setShowMobileMenu(false)} onJoin={joinRoom} onSearch={startDirectChat} />}

      <style>{`
         .animate-fade-in { animation: fadeIn 0.2s ease-out; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default Home;