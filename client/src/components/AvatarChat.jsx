import React, { useEffect, useRef, useState } from 'react';
import { TalkingHead } from "talkinghead";
import io from 'socket.io-client';
import { AudioQueue } from '../utils/AudioQueue';

const AvatarChat = () => {
    const avatarContainerRef = useRef(null);
    const [head, setHead] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [audioQueue, setAudioQueue] = useState(null);
    const [isThinking, setIsThinking] = useState(false);

    // Initialize Socket.io
    useEffect(() => {
        const newSocket = io('http://localhost:5000'); // Change to your backend URL
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    // Initialize AudioQueue
    useEffect(() => {
        if (head) {
            const queue = new AudioQueue(async (audioBlob, text) => {
                // This callback runs when we pop an item from queue
                try {
                    // head.speakAudio(blob) resolves when audio finishes
                    await head.speakAudio(audioBlob, { text: text });
                } catch (err) {
                    console.error("Speak error:", err);
                }
            });
            setAudioQueue(queue);
        }
    }, [head]);

    // Initialize Avatar
    useEffect(() => {
        const initAvatar = async () => {
            if (!avatarContainerRef.current) return;

            // Initialize TalkingHead
            const nodeAvatar = document.getElementById('avatar-container');

            try {
                const newHead = new TalkingHead(nodeAvatar, {
                    ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize", // Default fallback
                    cameraView: "upper", // 'upper', 'full', 'head'
                });

                // Load Ready Player Me model
                // Using a demo model or the user's provided URL. 
                // Ensure morph targets are enabled in RPM download settings!
                await newHead.showAvatar({
                    url: "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024",
                    body: "F",
                    avatarMood: "neutral",
                    ttsLang: "en-US",
                    ttsVoice: "en-US-Standard-A",
                    lipsyncLang: 'en'
                });

                setHead(newHead);
            } catch (error) {
                console.error("Failed to load avatar:", error);
            }
        };

        if (!head) {
            initAvatar(); // Call strictly once ideally
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Socket Event Listeners
    useEffect(() => {
        if (!socket || !audioQueue) return;

        socket.on('text_chunk', (data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'ai' && lastMsg.isStreaming) {
                    // Append to streaming message
                    const updated = [...prev];
                    updated[updated.length - 1].text += data.text + " ";
                    return updated;
                } else {
                    // Start new message
                    return [...prev, { role: 'ai', text: data.text + " ", isStreaming: true }];
                }
            });
            setIsThinking(false);
        });

        socket.on('audio_chunk', async (data) => {
            // Convert base64 to Blob
            const byteCharacters = atob(data.audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/mp3' });

            // Add to queue
            audioQueue.enqueue(blob, data.text);
        });

        socket.on('stream_done', () => {
            setMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0) updated[updated.length - 1].isStreaming = false;
                return updated;
            });
        });

        return () => {
            socket.off('text_chunk');
            socket.off('audio_chunk');
            socket.off('stream_done');
        };
    }, [socket, audioQueue]);

    const handleSend = () => {
        if (!inputText.trim() || !socket) return;

        // User message
        setMessages(prev => [...prev, { role: 'user', text: inputText }]);
        socket.emit('user_message', { message: inputText });

        setInputText("");
        setIsThinking(true);

        // Interrupt current speech if any?
        // audioQueue.clear(); 
        // if(head) head.stopSpeaking(); 
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* Avatar Container */}
            <div id="avatar-container" ref={avatarContainerRef} className="flex-1 w-full bg-gradient-to-b from-gray-800 to-gray-900 relative">
                {/* 3D Canvas will be injected here by TalkingHead */}
                {!head && <div className="absolute inset-0 flex items-center justify-center">Loading Avatar...</div>}
            </div>

            {/* Subtitles / Chat Overlay */}
            <div className="h-1/3 bg-gray-800 p-4 border-t border-gray-700 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-2 relative">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`p-2 rounded max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 self-end ml-auto' : 'bg-gray-700 self-start'}`}>
                            <strong>{msg.role === 'user' ? 'You' : 'Dr. AI'}:</strong> {msg.text}
                        </div>
                    ))}
                    {isThinking && <div className="text-gray-400 italic text-sm">Thinking...</div>}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                        placeholder="Ask me anything..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarChat;
