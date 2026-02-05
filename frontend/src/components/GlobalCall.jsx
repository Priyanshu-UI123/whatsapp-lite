import { useState, useEffect, useRef } from "react";
import Peer from "simple-peer";

// 🎵 SOUNDS
const RINGTONE_SOUND = "https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3";

const GlobalCall = ({ socket, userData }) => {
    const [callStatus, setCallStatus] = useState("idle");
    const [callerSignal, setCallerSignal] = useState(null);
    const [callerName, setCallerName] = useState("");
    const [callerId, setCallerId] = useState("");
    const [remoteStream, setRemoteStream] = useState(null);
    
    const ringtoneAudio = useRef(new Audio(RINGTONE_SOUND));
    const userAudio = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        if (!socket || !userData) return;

        // 1. SETUP: Tell server "I am here"
        socket.emit("setup", userData);

        // 2. LISTEN: Incoming Call
        socket.on("callUser", (data) => {
            console.log("📞 GLOBAL CALL RECEIVED");
            setCallStatus("incoming");
            setCallerSignal(data.signal);
            setCallerName(data.name);
            setCallerId(data.from);
            ringtoneAudio.current.loop = true;
            ringtoneAudio.current.play().catch(() => {});
        });

        return () => {
            socket.off("callUser");
        };
    }, [socket, userData]);

    const answerCall = () => {
        setCallStatus("connected");
        ringtoneAudio.current.pause();

        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: stream,
                config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
            });

            peer.on("signal", (data) => {
                socket.emit("answerCall", { signal: data, to: callerId });
            });

            peer.on("stream", (stream) => {
                if (userAudio.current) {
                    userAudio.current.srcObject = stream;
                    userAudio.current.play();
                }
            });

            peer.signal(callerSignal);
            connectionRef.current = peer;
        });
    };

    const rejectCall = () => {
        setCallStatus("idle");
        ringtoneAudio.current.pause();
        socket.emit("endCall", { to: callerId });
    };

    if (callStatus === "idle") return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-4">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-white/10 w-full max-w-sm text-center shadow-2xl">
                <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto animate-pulse mb-4 flex items-center justify-center text-3xl">👤</div>
                <h2 className="text-2xl font-bold text-white">{callerName || "Unknown"}</h2>
                <p className="text-blue-400 text-sm mb-8 animate-pulse">
                    {callStatus === "incoming" ? "Incoming Global Call..." : "Connected"}
                </p>

                {callStatus === "incoming" && (
                    <div className="flex justify-center gap-8">
                        <button onClick={answerCall} className="w-16 h-16 bg-green-500 rounded-full text-2xl animate-bounce shadow-lg">📞</button>
                        <button onClick={rejectCall} className="w-16 h-16 bg-red-500 rounded-full text-white shadow-lg">❌</button>
                    </div>
                )}
                
                {callStatus === "connected" && (
                    <button onClick={rejectCall} className="bg-red-500 px-6 py-3 rounded-full text-white font-bold w-full">End Call</button>
                )}
            </div>
            
            {/* Hidden Audio Player */}
            <audio ref={userAudio} autoPlay playsInline controls={false} />
        </div>
    );
};

export default GlobalCall;