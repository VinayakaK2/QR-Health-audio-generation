import React, { useEffect, useRef, useState } from 'react';
import { TalkingHead } from "@met4citizen/talkinghead";
import io from 'socket.io-client';
import { AudioQueue } from '../utils/AudioQueue';
import { useNavigate } from 'react-router-dom';
import { X, Send, Mic, MicOff, MessageSquare, Video } from 'lucide-react';

const HealthBuddy = () => {
    const navigate = useNavigate();
    const avatarContainerRef = useRef(null);
    const isInitialized = useRef(false);

    // Modes: 'chat' | 'live'
    const [mode, setMode] = useState('chat');

    // Core State
    const [head, setHead] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [audioQueue, setAudioQueue] = useState(null);
    const [isThinking, setIsThinking] = useState(false);

    // Live Mode Specific State
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    // 1. Socket Connection
    useEffect(() => {
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    // // 2. Audio Queue (Browser Voice Mode)
    // useEffect(() => {
    //     // We don't strictly need 'head' to be ready for browser TTS, 
    //     // but we'll keep the dependency if we want to add animations later.
    //     if (head) {
    //         const queue = new AudioQueue(async (text) => {
    //             console.log("🗣️ Speaking:", text);
    //             return new Promise((resolve, reject) => {
    //                 try {
    //                     // Create Utterance
    //                     const utterance = new SpeechSynthesisUtterance(text);

    //                     // Select Voice (try to find Google US English or similar)
    //                     const voices = window.speechSynthesis.getVoices();
    //                     const preferredVoice = voices.find(v =>
    //                         v.name.includes("Google US English") ||
    //                         v.name.includes("Microsoft David") ||
    //                         v.lang === "en-US"
    //                     );
    //                     if (preferredVoice) utterance.voice = preferredVoice;

    //                     utterance.rate = 1.0;
    //                     utterance.pitch = 1.0;

    //                     // Event Listeners for Queue Management
    //                     utterance.onend = () => {
    //                         console.log("✅ Speech finished");
    //                         resolve();
    //                     };
    //                     utterance.onerror = (e) => {
    //                         console.error("❌ Speech Error:", e);
    //                         resolve(); // Resolve anyway to keep queue moving
    //                     };

    //                     // Speak
    //                     window.speechSynthesis.cancel(); // Cancel potential overlap
    //                     window.speechSynthesis.speak(utterance);

    //                     // Optional: Trigger random animation on avatar if available
    //                     if (head && typeof head.startLipsync === 'function') {
    //                         // head.speakText handles this internally, but we are bypassing it.
    //                         // We might not get accurate lipsync without the library's internal TTS.
    //                         // For now, at least we get Audio.
    //                     }

    //                 } catch (err) {
    //                     console.error("❌ AudioQueue Error:", err);
    //                     resolve();
    //                 }
    //             });
    //         });
    //         setAudioQueue(queue);
    //     }
    // }, [head]);

    // 2. Audio Queue (Corrected for Lip-Sync)
    useEffect(() => {
        if (head) {
            const queue = new AudioQueue(async (text) => {
                console.log("🗣️ Avatar Speaking:", text);
                try {
                    // FIX: Use the head's built-in function instead of manual window.speechSynthesis
                    // This allows the library to calculate lip-sync while speaking.
                    await head.speakText(text, {
                        rate: 1.0,    // Speed of speech
                        pitch: 1.0,   // Pitch of speech
                        volume: 1.0   // Volume
                    });

                    console.log("✅ Speech finished");
                } catch (err) {
                    console.error("❌ AudioQueue Error:", err);
                }
            });
            setAudioQueue(queue);
        }
    }, [head]);

    // 3. Initialize Avatar (Loaded only when entering Live Mode or pre-loaded)
    // We'll load it once on mount but hide it in chat mode to avoid reloading delays
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
                    lipsyncRoot: "/lipsync/",
                    lipsyncModules: ["lipsync-en.mjs"],
                    lipsyncLang: "en"
                });

                await newHead.showAvatar({
                    url: "https://models.readyplayer.me/6943e2398f9c70cbc9b4c9bb.glb?morphTargets=ARKit",
                    body: "M",
                    avatarMood: "neutral"
                });

                setHead(newHead);
                setIsAvatarLoading(false);
                console.log("✅ Avatar + Lipsync Loaded");
            } catch (error) {
                console.error("Avatar Failed:", error);
                isInitialized.current = false;
                setIsAvatarLoading(false);
            }
        };

        // Initialize immediately to be ready
        setTimeout(initAvatar, 500);
    }, []);

    // 4. Initialize Speech Recognition
    const isProcessingSpeech = useRef(false);

    useEffect(() => {
        let recog = null;
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recog = new SpeechRecognition();
            recog.continuous = true; // Stop after one sentence
            recog.interimResults = false;
            recog.lang = 'en-US';

            recog.onstart = () => setIsListening(true);
            recog.onend = () => {
                setIsListening(false);
                isProcessingSpeech.current = false;
            };

            recog.onresult = (event) => {
                const result = event.results[0];
                const transcript = result[0].transcript;

                // Prevent duplicate processing
                if (isProcessingSpeech.current) return;

                // Ensure it's final or strictly treat first result as final for this setups
                if (result.isFinal || !recog.interimResults) {
                    isProcessingSpeech.current = true;
                    console.log("🎤 Heard:", transcript);
                    handleSendMessage(transcript);
                }
            };

            setRecognition(recog);
        }

        // Cleanup
        return () => {
            if (recog) recog.abort();
        };
    }, [socket]); // Re-bind if socket changes

    // 5. Socket Listeners
    useEffect(() => {
        if (!socket) return; // audioQueue might be null in chat mode initially, handle text separately

        socket.on('text_chunk', (data) => {
            // Update Text Chat UI
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

            // If in Live Mode, Speak it
            if (mode === 'live' && audioQueue) {
                audioQueue.enqueue(data.text);
            }
        });

        return () => {
            socket.off('text_chunk');
        };
    }, [socket, audioQueue, mode]);

    // 6. Handle TTS Voices & Cleanup
    useEffect(() => {
        const handleVoicesChanged = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log(`🗣️ Voices loaded: ${voices.length} available.`);
        };

        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const handleSendMessage = (text) => {
        if (!text.trim() || !socket) return;

        // Unlock Audio Context if in Live Mode
        if (mode === 'live' && head && head.audioCtx && head.audioCtx.state === 'suspended') {
            head.audioCtx.resume();
        }

        setMessages(prev => [...prev, { role: 'user', text: text }]);
        socket.emit('user_message', { message: text });
        setIsThinking(true);
    };

    const handleMicClick = () => {
        if (recognition) {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        } else {
            alert("Voice recognition not supported in this browser.");
        }
    };

    const toggleMode = () => {
        // Cancel any ongoing speech when switching modes
        window.speechSynthesis.cancel();
        setMode(prev => prev === 'chat' ? 'live' : 'chat');
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white relative overflow-hidden">

            {/* 3D AVATAR CONTAINER - Visible only in Live Mode or Background */}
            <div
                ref={avatarContainerRef}
                className={`absolute inset-0 bg-[#0f172a] transition-opacity duration-500 ${mode === 'live' ? 'opacity-100 z-10' : 'opacity-0 -z-10'}`} // Hide in chat mode
            />

            {/* HEADER */}
            <div className="absolute top-0 w-full p-4 flex justify-between z-50 bg-gradient-to-b from-gray-900 via-gray-900/80 to-transparent">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Health Buddy</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mode === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'}`}>
                        {mode === 'live' ? 'LIVE' : 'CHAT'}
                    </span>
                </div>
                <div className='flex gap-2'>
                    <button
                        onClick={toggleMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all backdrop-blur-md border ${mode === 'live' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                    >
                        {mode === 'live' ? <MessageSquare size={18} /> : <Video size={18} />}
                        <span>{mode === 'live' ? 'Switch to Chat' : 'Start Live Call'}</span>
                    </button>
                    <button onClick={() => navigate('/patient/dashboard')} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* LIVE MODE LOADING OVERLAY */}
            {mode === 'live' && isAvatarLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
                    <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
                    <p className="animate-pulse text-blue-400 text-lg">Summoning Dr. AI...</p>
                </div>
            )}

            {/* ---------------- CHAT MODE UI ---------------- */}
            {mode === 'chat' && (
                <div className="flex flex-col h-full pt-20 pb-4 px-4 max-w-4xl mx-auto w-full z-20">
                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/20 px-20">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                                <MessageSquare size={48} />
                                <p>Start a conversation with your Health Buddy.</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-4 rounded-2xl max-w-[80%] text-base shadow-md ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700 rounded-bl-none'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-bl-none">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-3 bg-slate-800 p-2 rounded-full border border-slate-700 shadow-lg">
                        <input
                            className="flex-1 bg-transparent border-none text-white px-4 focus:ring-0 placeholder:text-slate-500"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText) && setInputText("")}
                        />
                        <button
                            onClick={() => { handleSendMessage(inputText); setInputText(""); }}
                            className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ---------------- LIVE MODE UI ---------------- */}
            {mode === 'live' && !isAvatarLoading && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-end pb-12 pointer-events-none">
                    {/* Status Text - What AI is doing */}
                    {isThinking && (
                        <div className="absolute top-1/4 animate-pulse bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white/80">
                            Dr. AI is thinking...
                        </div>
                    )}

                    <div className="pointer-events-auto flex flex-col items-center gap-6">
                        {/* Mic Button */}
                        <button
                            onClick={handleMicClick}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${isListening ? 'bg-red-500 scale-110 shadow-red-500/50 animate-pulse' : 'bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md'}`}
                        >
                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                        </button>

                        <p className="text-white/60 text-sm font-medium tracking-wider uppercase">
                            {isListening ? "Listening..." : "Tap to Speak"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthBuddy;