// import React, { useEffect, useRef, useState } from 'react';
// import { TalkingHead } from "@met4citizen/talkinghead";
// import io from 'socket.io-client';
// import { AudioQueue } from '../utils/AudioQueue';
// import { useNavigate } from 'react-router-dom';
// import { X, Send, Mic } from 'lucide-react';
// import toast from 'react-hot-toast';

// const HealthBuddy = () => {
//     const navigate = useNavigate();
//     const avatarContainerRef = useRef(null);
//     const [head, setHead] = useState(null);
//     const [socket, setSocket] = useState(null);
//     const [messages, setMessages] = useState([]);
//     const [inputText, setInputText] = useState("");
//     const [audioQueue, setAudioQueue] = useState(null);
//     const [isThinking, setIsThinking] = useState(false);
//     const [isAvatarLoading, setIsAvatarLoading] = useState(true);
//     const [avatarError, setAvatarError] = useState(null);
//     const [isConnected, setIsConnected] = useState(false);

//     // Initialize Socket.io
//     useEffect(() => {
//         const newSocket = io('http://localhost:5000');
//         setSocket(newSocket);

//         newSocket.on('connect', () => setIsConnected(true));
//         newSocket.on('disconnect', () => setIsConnected(false));

//         return () => newSocket.close();
//     }, []);

//     // Initialize AudioQueue
//     useEffect(() => {
//         if (head) {
//             const queue = new AudioQueue(async (audioBlob, text) => {
//                 try {
//                     await head.speakAudio(audioBlob, { text: text });
//                 } catch (err) {
//                     console.error("Speak error:", err);
//                 }
//             });
//             setAudioQueue(queue);
//         }
//     }, [head]);

//     // // Initialize Avatar
//     // useEffect(() => {
//     //     const initAvatar = async () => {
//     //         if (!avatarContainerRef.current) return;
//     //         if (avatarContainerRef.current.children.length > 0) return;

//     //         try {
//     //             setIsAvatarLoading(true);
//     //             setAvatarError(null);

//     //             console.log("Initializing TalkingHead...");
//     //             const newHead = new TalkingHead(avatarContainerRef.current, {
//     //                 ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
//     //                 cameraView: "upper",
//     //                 cameraDistance: 1.5,
//     //                 avatarMood: "neutral",
//     //                 lipsyncLang: 'en'
//     //             });

//     //             // Load Ready Player Me model
//     //             console.log("Loading Avatar Model...");
//     //             await newHead.showAvatar({
//     //                 url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
//     //                 body: "M",
//     //                 avatarMood: "neutral",
//     //                 ttsLang: "en-US",
//     //                 ttsVoice: "en-US-Neural2-D",
//     //                 lipsyncLang: 'en'
//     //             });

//     //             console.log("Avatar Loaded Successfully");
//     //             setHead(newHead);
//     //             setIsAvatarLoading(false);
//     //         } catch (error) {
//     //             console.error("Failed to load avatar:", error);
//     //             setAvatarError("Failed to load 3D Avatar");
//     //             setIsAvatarLoading(false);
//     //             toast.error("Failed to load 3D Avatar. Check console.");
//     //         }
//     //     };

//     //     // Safety timeout to ensure loading screen doesn't get stuck
//     //     const safetyTimer = setTimeout(() => {
//     //         setIsAvatarLoading(false);
//     //     }, 10000);

//     //     // Slight delay to ensure DOM is ready
//     //     const timer = setTimeout(() => initAvatar(), 100);
//     //     return () => {
//     //         clearTimeout(timer);
//     //         clearTimeout(safetyTimer);
//     //     };
//     // }, []);

//     // Add a ref to track initialization status
//     const isInitializing = useRef(false);

//     useEffect(() => {
//         const initAvatar = async () => {
//             // 1. Prevent double-run in React Strict Mode
//             if (isInitializing.current || head) return;
//             isInitializing.current = true;

//             if (!avatarContainerRef.current) return;

//             try {
//                 setIsAvatarLoading(true);

//                 // 2. Clear container to ensure a fresh start
//                 avatarContainerRef.current.innerHTML = '';

//                 const newHead = new TalkingHead(avatarContainerRef.current, {
//                     ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
//                     cameraView: "upper",
//                     cameraDistance: 1.5,
//                     fillerIdle: true // Keeps the avatar moving so you know it's "alive"
//                 });

//                 // 3. Load the model
//                 await newHead.showAvatar({
//                     url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
//                     body: "M",
//                     lipsyncLang: 'en'
//                 });

//                 setHead(newHead);
//                 setIsAvatarLoading(false);
//             } catch (error) {
//                 console.error("Avatar Load Error:", error);
//                 setAvatarError("Failed to load 3D Avatar");
//                 setIsAvatarLoading(false);
//                 isInitializing.current = false; // Allow retry
//             }
//         };

//         initAvatar();

//         // Cleanup function
//         return () => {
//             // If TalkingHead has a dispose method, call it here
//             if (head && head.dispose) head.dispose();
//         };
//     }, []); // Empty dependency array is critical here

//     // Socket Event Listeners
//     useEffect(() => {
//         if (!socket || !audioQueue) return;

//         socket.on('text_chunk', (data) => {
//             setMessages(prev => {
//                 const lastMsg = prev[prev.length - 1];
//                 if (lastMsg && lastMsg.role === 'ai' && lastMsg.isStreaming) {
//                     const updated = [...prev];
//                     updated[updated.length - 1].text += data.text + " ";
//                     return updated;
//                 } else {
//                     return [...prev, { role: 'ai', text: data.text + " ", isStreaming: true }];
//                 }
//             });
//             setIsThinking(false);
//         });

//         socket.on('audio_chunk', async (data) => {
//             const byteCharacters = atob(data.audio);
//             const byteNumbers = new Array(byteCharacters.length);
//             for (let i = 0; i < byteCharacters.length; i++) {
//                 byteNumbers[i] = byteCharacters.charCodeAt(i);
//             }
//             const byteArray = new Uint8Array(byteNumbers);
//             const blob = new Blob([byteArray], { type: 'audio/mp3' });

//             audioQueue.enqueue(blob, data.text);
//         });

//         socket.on('stream_done', () => {
//             setMessages(prev => {
//                 const updated = [...prev];
//                 if (updated.length > 0) updated[updated.length - 1].isStreaming = false;
//                 return updated;
//             });
//         });

//         return () => {
//             socket.off('text_chunk');
//             socket.off('audio_chunk');
//             socket.off('stream_done');
//         };
//     }, [socket, audioQueue]);

//     const handleSend = () => {
//         if (!inputText.trim() || !socket) return;

//         setMessages(prev => [...prev, { role: 'user', text: inputText }]);
//         socket.emit('user_message', { message: inputText });

//         setInputText("");
//         setIsThinking(true);
//     };

//     return (
//         <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden relative">
//             {/* Header */}
//             <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
//                 <div className="flex items-center space-x-2">
//                     <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
//                     <span className="font-bold text-lg drop-shadow-md">Dr. AI Assistant</span>
//                 </div>
//                 <button onClick={() => navigate('/patient/dashboard')} className="p-2 bg-black/40 rounded-full hover:bg-white/20 transition">
//                     <X className="w-6 h-6 text-white" />
//                 </button>
//             </div>

//             {/* Avatar Container (Full Screen 3D background) */}
//             {/* Avatar Container (Full Screen 3D background) */}
//             <div
//                 id="avatar-container"
//                 ref={avatarContainerRef}
//                 className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900"
//                 style={{
//                     width: '100%',
//                     height: '100%',
//                     minHeight: '500px',
//                     position: 'relative',
//                     zIndex: 0 // Base layer
//                 }}
//             >
//                 {/* Canvas will be injected here by TalkingHead (z-auto usually stacks above background) */}

//                 {isAvatarLoading && (
//                     <div className="flex flex-col items-center justify-center h-full text-white/50 animate-pulse bg-gray-900 absolute inset-0" style={{ zIndex: 10 }}>
//                         <p className="text-xl font-light">Summoning Avatar...</p>
//                     </div>
//                 )}

//                 {avatarError && (
//                     <div className="flex flex-col items-center justify-center h-full text-red-500 bg-gray-900 absolute inset-0" style={{ zIndex: 11 }}>
//                         <p className="text-xl font-light">{avatarError}</p>
//                     </div>
//                 )}
//             </div>

//             {/* Chat Interface (Overlay at bottom) */}
//             <div className="absolute bottom-0 w-full z-10 flex flex-col justify-end pointer-events-none p-4 pb-8 h-1/2 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent">

//                 {/* Messages Area */}
//                 <div className="flex-1 overflow-y-auto space-y-3 px-2 mb-4 pointer-events-auto mask-image-gradient">
//                     {messages.map((msg, idx) => (
//                         <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                             <div className={`
//                                 max-w-[80%] p-3 rounded-2xl backdrop-blur-md text-sm md:text-base shadow-lg
//                                 ${msg.role === 'user'
//                                     ? 'bg-blue-600/80 text-white rounded-br-none'
//                                     : 'bg-white/10 text-white rounded-bl-none border border-white/10'}
//                             `}>
//                                 {msg.text}
//                             </div>
//                         </div>
//                     ))}
//                     {isThinking && (
//                         <div className="flex justify-start">
//                             <div className="bg-white/10 px-4 py-2 rounded-full text-xs text-white/70 animate-pulse">
//                                 Thinking...
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Input Area */}
//                 <div className="pointer-events-auto flex items-center gap-2 bg-gray-800/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-xl mx-auto w-full max-w-2xl">
//                     <input
//                         type="text"
//                         className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 placeholder-gray-400"
//                         placeholder="Ask about your health..."
//                         value={inputText}
//                         onChange={(e) => setInputText(e.target.value)}
//                         onKeyDown={(e) => e.key === 'Enter' && handleSend()}
//                     />
//                     <button
//                         onClick={handleSend}
//                         className="bg-blue-600 hover:bg-blue-500 p-2 rounded-full transition-transform active:scale-95 text-white"
//                         disabled={!isConnected}
//                     >
//                         <Send className="w-5 h-5" />
//                     </button>
//                     {/* Placeholder for future Mic integration */}
//                     {/* <button className="p-2 text-gray-400 hover:text-white"><Mic className="w-5 h-5" /></button> */}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default HealthBuddy;

// import React, { useEffect, useRef, useState } from 'react';
// import { TalkingHead } from "@met4citizen/talkinghead";
// import io from 'socket.io-client';
// import { AudioQueue } from '../utils/AudioQueue';
// import { useNavigate } from 'react-router-dom';
// import { X, Send } from 'lucide-react';

// const HealthBuddy = () => {
//     const navigate = useNavigate();
//     const avatarContainerRef = useRef(null);
//     const isInitialized = useRef(false);

//     const [head, setHead] = useState(null);
//     const [socket, setSocket] = useState(null);
//     const [messages, setMessages] = useState([]);
//     const [inputText, setInputText] = useState("");
//     const [audioQueue, setAudioQueue] = useState(null);
//     const [isThinking, setIsThinking] = useState(false);
//     const [isAvatarLoading, setIsAvatarLoading] = useState(true);
//     const [isConnected, setIsConnected] = useState(false);

//     useEffect(() => {
//         const newSocket = io('http://localhost:5000');
//         setSocket(newSocket);
//         newSocket.on('connect', () => setIsConnected(true));
//         return () => newSocket.close();
//     }, []);

//     useEffect(() => {
//         if (head) {
//             const queue = new AudioQueue(async (audioBlob, text) => {
//                 try {
//                     await head.speakAudio(audioBlob, { text: text });
//                 } catch (err) { console.error(err); }
//             });
//             setAudioQueue(queue);
//         }
//     }, [head]);

//     useEffect(() => {
//         // const initAvatar = async () => {
//         //     if (isInitialized.current || !avatarContainerRef.current) return;

//         //     try {
//         //         isInitialized.current = true;
//         //         setIsAvatarLoading(true);

//         //         // Force clear the container
//         //         avatarContainerRef.current.innerHTML = '';

//         //         // Create the TalkingHead instance
//         //         // const newHead = new TalkingHead(avatarContainerRef.current, {
//         //         //     ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
//         //         //     cameraView: "upper",
//         //         //     cameraDistance: 2.0, // Moved back slightly to ensure visibility
//         //         //     fillerIdle: true,
//         //         //     lipsyncModules: ["/lipsync/lipsync-en.mjs"]
//         //         // });

//         //         const newHead = new TalkingHead(avatarContainerRef.current, {
//         //             ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
//         //             cameraView: "upper",
//         //             cameraDistance: 2.0,
//         //             fillerIdle: true,
//         //             // ADD THIS LINE: It tells the library the base folder for all lip-sync files
//         //             lipsyncRoot: "/lipsync/",
//         //             // Simplify this to just the filename now
//         //             lipsyncModules: ["lipsync-en.mjs"]
//         //         });

//         //         // Load the model
//         //         await newHead.showAvatar({
//         //             url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
//         //             body: "M",
//         //             avatarMood: "neutral"
//         //         });

//         //         setHead(newHead);
//         //         setIsAvatarLoading(false);
//         //         console.log("AVATAR VISIBILITY CHECK: Loaded successfully");
//         //     } catch (error) {
//         //         console.error("Avatar error:", error);
//         //         setIsAvatarLoading(false);
//         //         isInitialized.current = false;
//         //     }
//         // };


//         // Inside your useEffect...

//         const initAvatar = async () => {
//             if (isInitialized.current || !avatarContainerRef.current) return;

//             try {
//                 isInitialized.current = true;
//                 setIsAvatarLoading(true);

//                 // Clear the container
//                 avatarContainerRef.current.innerHTML = '';

//                 // 1. Calculate the FULL PATH to your file
//                 // This creates "http://localhost:5173/lipsync/lipsync-en.mjs" dynamically
//                 const lipsyncUrl = window.location.origin + "/lipsync/lipsync-en.mjs";
//                 console.log("Loading Lip-sync from:", lipsyncUrl); // check console for this!

//                 const newHead = new TalkingHead(avatarContainerRef.current, {
//                     ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
//                     cameraView: "upper",
//                     cameraDistance: 2.0,
//                     fillerIdle: true,
//                     // 2. FORCE the full URL so the library cannot get lost
//                     lipsyncModules: [lipsyncUrl]
//                 });

//                 await newHead.showAvatar({
//                     url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
//                     body: "M",
//                     avatarMood: "neutral",
//                     // 3. Re-enable the language setting now that the path is fixed
//                     lipsyncLang: 'en'
//                 });

//                 setHead(newHead);
//                 setIsAvatarLoading(false);
//                 console.log("Avatar Loaded & Ready to Speak");
//             } catch (error) {
//                 console.error("Avatar error:", error);
//                 setIsAvatarLoading(false);
//                 isInitialized.current = false;
//             }
//         };
//         // Small delay to ensure the DOM div has its full height/width
//         const timer = setTimeout(() => initAvatar(), 500);
//         return () => {
//             clearTimeout(timer);
//             if (avatarContainerRef.current) avatarContainerRef.current.innerHTML = '';
//         };
//     }, []);

//     // Socket listeners remain the same...
//     useEffect(() => {
//         if (!socket || !audioQueue) return;
//         socket.on('text_chunk', (data) => {
//             setMessages(prev => {
//                 const last = prev[prev.length - 1];
//                 if (last?.role === 'ai' && last.isStreaming) {
//                     const updated = [...prev];
//                     updated[updated.length - 1].text += data.text + " ";
//                     return updated;
//                 }
//                 return [...prev, { role: 'ai', text: data.text + " ", isStreaming: true }];
//             });
//             setIsThinking(false);
//         });
//         // socket.on('audio_chunk', async (data) => {
//         //     const blob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mp3' });
//         //     audioQueue.enqueue(blob, data.text);
//         // });
//         socket.on('audio_chunk', async (data) => {
//             console.log("Audio chunk received from server!"); // Add this log
//             const byteCharacters = atob(data.audio);
//             const byteNumbers = new Array(byteCharacters.length);
//             for (let i = 0; i < byteCharacters.length; i++) {
//                 byteNumbers[i] = byteCharacters.charCodeAt(i);
//             }
//             const byteArray = new Uint8Array(byteNumbers);
//             const blob = new Blob([byteArray], { type: 'audio/mp3' });

//             // Check if the blob size is greater than 0
//             console.log("Audio Blob created, size:", blob.size);
//             audioQueue.enqueue(blob, data.text);
//         });
//         socket.on('stream_done', () => {
//             setMessages(prev => {
//                 const updated = [...prev];
//                 if (updated.length > 0) updated[updated.length - 1].isStreaming = false;
//                 return updated;
//             });
//         });
//         return () => {
//             socket.off('text_chunk');
//             socket.off('audio_chunk');
//             socket.off('stream_done');
//         };
//     }, [socket, audioQueue]);

//     const handleSend = () => {
//         if (!inputText.trim() || !socket) return;
//         setMessages(prev => [...prev, { role: 'user', text: inputText }]);
//         socket.emit('user_message', { message: inputText });
//         setInputText("");
//         setIsThinking(true);
//     };

//     return (
//         <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">

//             {/* 3D AVATAR CONTAINER - The CSS here is the most important part */}
//             <div
//                 ref={avatarContainerRef}
//                 className="absolute inset-0 w-full h-full"
//                 style={{
//                     zIndex: 0,
//                     backgroundColor: '#0f172a', // Matches slate-900
//                     display: 'block',
//                     minHeight: '100vh'
//                 }}
//             />

//             {/* HEADER */}
//             <div className="absolute top-0 w-full p-6 flex justify-between z-20 bg-gradient-to-b from-black/50 to-transparent">
//                 <div className="flex items-center gap-3">
//                     <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(34,197,94,0.5)]`} />
//                     <span className="font-bold tracking-wide uppercase text-sm">Health Buddy Live</span>
//                 </div>
//                 <button onClick={() => navigate('/patient/dashboard')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
//                     <X className="w-6 h-6" />
//                 </button>
//             </div>

//             {/* LOADING OVERLAY */}
//             {isAvatarLoading && (
//                 <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
//                     <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
//                     <p className="text-blue-400 font-medium animate-pulse">Initializing 3D Environment...</p>
//                 </div>
//             )}

//             {/* CHAT INTERFACE */}
//             <div className="absolute bottom-0 w-full z-10 p-6 h-1/2 flex flex-col justify-end bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none">
//                 <div className="overflow-y-auto mb-6 pointer-events-auto space-y-4 max-w-3xl mx-auto w-full scrollbar-hide">
//                     {messages.map((m, i) => (
//                         <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                             <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-xl backdrop-blur-md ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/10 border border-white/20 rounded-bl-none'
//                                 }`}>
//                                 {m.text}
//                             </div>
//                         </div>
//                     ))}
//                     {isThinking && (
//                         <div className="flex gap-1 p-2">
//                             <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
//                             <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
//                             <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
//                         </div>
//                     )}
//                 </div>

//                 <div className="pointer-events-auto flex gap-3 max-w-2xl mx-auto w-full pb-4">
//                     <input
//                         className="flex-1 bg-white/10 border border-white/20 backdrop-blur-md rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/30"
//                         placeholder="Type your health question..."
//                         value={inputText}
//                         onChange={e => setInputText(e.target.value)}
//                         onKeyDown={e => e.key === 'Enter' && handleSend()}
//                     />
//                     <button
//                         onClick={handleSend}
//                         className="bg-blue-600 hover:bg-blue-500 p-4 rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
//                     >
//                         <Send className="w-5 h-5" />
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default HealthBuddy;

import React, { useEffect, useRef, useState } from 'react';
import { TalkingHead } from "@met4citizen/talkinghead";
import io from 'socket.io-client';
import { AudioQueue } from '../utils/AudioQueue';
import { useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';

const HealthBuddy = () => {
    const navigate = useNavigate();
    const avatarContainerRef = useRef(null);
    const isInitialized = useRef(false);

    const [head, setHead] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [audioQueue, setAudioQueue] = useState(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isAvatarLoading, setIsAvatarLoading] = useState(true);

    // 1. Socket Connection
    useEffect(() => {
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    // 2. Audio Queue (Browser Voice Mode)
    useEffect(() => {
        if (head) {
            const queue = new AudioQueue(async (text) => {
                console.log("🗣️ Speaking:", text);
                try {

                    console.log("head", head);
                    if (!head || typeof head.speakText !== "function") {
                        console.warn("⚠️ speakText not ready");
                        return;
                    }

                    // 🔓 Always unlock audio
                    if (head.audioCtx?.state === "suspended") {
                        await head.audioCtx.resume();
                    }

                    console.log("🗣️ Speaking:", text);
                    await head.speakText(text);
                } catch (err) {
                    console.error("❌ Speech Error:", err);
                }
            });
            setAudioQueue(queue);
        }
    }, [head]);

    // 3. Initialize Avatar (THE PATH FIX IS HERE)
    useEffect(() => {
        const initAvatar = async () => {
            if (isInitialized.current || !avatarContainerRef.current) return;

            try {
                isInitialized.current = true;
                setIsAvatarLoading(true);
                avatarContainerRef.current.innerHTML = '';
                const newHead = new TalkingHead(avatarContainerRef.current, {
                    cameraView: "upper",
                    cameraDistance: 2.0,

                    // ✅ DO NOT set ttsTarget
                    // ✅ DO NOT set ttsEndpoint
                    // ✅ DO NOT set speech config

                    // ✅ CORRECT lipsync (PUBLIC folder)
                    lipsyncRoot: "/lipsync/",
                    lipsyncModules: ["lipsync-en.mjs"],
                    lipsyncLang: "en"
                });



                await newHead.showAvatar({
                    url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
                    body: "M",
                    avatarMood: "neutral"
                });

                console.log("speakText ready:", typeof newHead.speakText);

                setHead(newHead);
                setIsAvatarLoading(false);
                console.log("✅ Avatar + Lipsync Loaded");
            } catch (error) {
                console.error("Avatar Failed:", error);
                isInitialized.current = false;
                setIsAvatarLoading(false);
            }
        };


        // Small delay to ensure the div is ready
        setTimeout(initAvatar, 500);
    }, []);

    // 4. Socket Listeners
    useEffect(() => {
        if (!socket || !audioQueue) return;

        socket.on('text_chunk', (data) => {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'ai' && last.isStreaming) {
                    const updated = [...prev];
                    updated[updated.length - 1].text += data.text + " ";
                    return updated;
                }
                return [...prev, { role: 'ai', text: data.text + " ", isStreaming: true }];
            });
            setIsThinking(false);

            // Send TEXT to the queue (Since OpenAI Audio failed)
            audioQueue.enqueue(data.text);
        });

        // We ignore 'audio_chunk' because your OpenAI quota is empty

        return () => {
            socket.off('text_chunk');
        };
    }, [socket, audioQueue]);

    const handleSend = () => {
        if (!inputText.trim() || !socket) return;

        // Unlock Audio Context on Click
        if (head && head.audioCtx && head.audioCtx.state === 'suspended') {
            head.audioCtx.resume();
        }

        setMessages(prev => [...prev, { role: 'user', text: inputText }]);
        socket.emit('user_message', { message: inputText });
        setInputText("");
        setIsThinking(true);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">
            <div ref={avatarContainerRef} className="absolute inset-0 bg-[#0f172a] block min-h-screen" style={{ zIndex: 0 }} />

            <div className="absolute top-0 w-full p-4 flex justify-between z-20">
                <span className="font-bold">Health Buddy Live</span>
                <button onClick={() => navigate('/patient/dashboard')}><X /></button>
            </div>

            {isAvatarLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
                    <p className="animate-pulse text-blue-400">Loading Avatar...</p>
                </div>
            )}

            <div className="absolute bottom-0 w-full z-10 p-4 h-1/2 flex flex-col justify-end bg-gradient-to-t from-slate-900 to-transparent pointer-events-none">
                <div className="overflow-y-auto mb-4 pointer-events-auto space-y-2 max-w-2xl mx-auto w-full">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-xl max-w-[80%] ${m.role === 'user' ? 'bg-blue-600' : 'bg-white/10'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && <div className="text-white/50 text-sm">Thinking...</div>}
                </div>

                <div className="pointer-events-auto flex gap-2 max-w-2xl mx-auto w-full">
                    <input
                        className="flex-1 bg-white/10 rounded-full px-4 py-3 border border-white/20"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type here..."
                    />
                    <button onClick={handleSend} className="bg-blue-600 p-3 rounded-full"><Send /></button>
                </div>
            </div>
        </div>
    );
};

export default HealthBuddy;