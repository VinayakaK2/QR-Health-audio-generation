import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, X, Activity, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const HealthBuddy = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // States
    const [stream, setStream] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState([]); // Array of { role: 'user'|'assistant', text: '' }
    const [cameraEnabled, setCameraEnabled] = useState(true);

    // Initial Setup: Request Camera
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true // We need audio permission for recording later
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            toast.error("Camera/Microphone access denied. HealthBuddy needs these to work.");
            setCameraEnabled(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    // --- Audio Recording Logic ---
    const startListening = () => {
        if (!stream) return;

        setIsListening(true);
        audioChunksRef.current = [];

        try {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                handleInteraction(audioBlob);
            };

            recorder.start();
        } catch (err) {
            console.error("Recorder Error:", err);
            toast.error("Failed to start audio recording.");
            setIsListening(false);
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            setIsProcessing(true);
        }
    };

    // --- Capture & Send Logic ---
    const handleInteraction = async (audioBlob) => {
        // Capture Video Frame
        let imageBase64 = null;
        if (videoRef.current && cameraEnabled) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            imageBase64 = dataUrl.split(',')[1]; // Remove prefix
        }

        // Prepare Form Data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        if (imageBase64) formData.append('imageBase64', imageBase64);

        // Send history contexts (last 4 messages)
        const historyContext = transcript.slice(-4).map(t => ({
            role: t.role,
            content: t.text
        }));
        formData.append('history', JSON.stringify(historyContext));

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/health-buddy/process', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                const { text, audioBase64, userTranscript, should_escalate, risk_level, emotion, animation_intensity } = res.data.data;

                // Emergency Handling
                if (should_escalate) {
                    toast.error("URGENT: Please seek medical help immediately!", { duration: 6000 });
                }

                // Update transcript with all metadata
                setTranscript(prev => [
                    ...prev,
                    { role: 'user', text: userTranscript || "(Audio Message)" },
                    {
                        role: 'assistant',
                        text: text,
                        isEmergency: should_escalate,
                        emotion: emotion,
                        intensity: animation_intensity
                    }
                ]);

                // Play Audio with avatar active
                if (audioBase64) {
                    setIsSpeaking(true);
                    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                    audio.onended = () => setIsSpeaking(false);
                    await audio.play();
                } else {
                    setIsSpeaking(false);
                }

            } else {
                toast.error(res.data.message || "Failed to process.");
            }
        } catch (err) {
            console.error("API Error:", err);
            toast.error("Connection error. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 text-white overflow-hidden flex flex-col z-50">
            {/* Header */}
            <header className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg">HealthBuddy AI</span>
                </div>
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    className="p-2 rounded-full bg-black/30 hover:bg-white/20 transition backdrop-blur-md"
                >
                    <X className="w-6 h-6" />
                </button>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center p-4">

                {/* Background Video (Webcam) - Reduced opacity */}
                {cameraEnabled ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
                    />
                ) : (
                    <div className="absolute inset-0 bg-slate-900" />
                )}

                {/* Dr. Aarav Avatar Container */}
                <div className="relative z-10 flex flex-col items-center max-w-lg w-full">

                    {/* Avatar Image with Animation Wrapper */}
                    <div className={`
                        relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl transition-all duration-300
                        ${isListening ? 'ring-4 ring-red-500/50 scale-95 brightness-90' : ''}
                        ${isSpeaking ? 'scale-105 brightness-110' : ''}
                    `}>
                        <img
                            src="/dr-aarav.jpg"
                            alt="Dr. Aarav"
                            className={`
                                w-full h-full object-cover transition-transform duration-100
                                ${isSpeaking && transcript[transcript.length - 1]?.intensity === 'high' ? 'animate-pulse-fast' : ''}
                                ${isSpeaking && transcript[transcript.length - 1]?.intensity === 'medium' ? 'animate-pulse-medium' : ''}
                            `}
                        />

                        {/* Mouth Simulation Overlay (Simple opacity pulse) */}
                        {isSpeaking && (
                            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-16 h-8 bg-black/10 blur-md animate-pulse" />
                        )}
                    </div>

                    {/* Status / Emotion Badge */}
                    <div className="mt-6 flex flex-col items-center space-y-2">
                        {isListening ? (
                            <span className="px-4 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 animate-pulse text-sm font-medium">
                                Listening...
                            </span>
                        ) : isProcessing ? (
                            <span className="px-4 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30 animate-pulse text-sm font-medium">
                                Thinking...
                            </span>
                        ) : isSpeaking ? (
                            <span className="px-4 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-500/30 text-sm font-medium">
                                Dr. Aarav is speaking
                            </span>
                        ) : (
                            <span className="px-4 py-1 rounded-full bg-white/10 text-white/60 border border-white/10 text-sm font-medium">
                                Tap mic to start
                            </span>
                        )}
                    </div>

                    {/* Subtitles / Transcript */}
                    <div className="mt-8 text-center px-4 min-h-[5rem] w-full">
                        {transcript.length > 0 && (
                            <div className="animate-fade-in">
                                {transcript.slice(-1).map((t, i) => (
                                    <p key={i} className={`text-lg md:text-xl font-medium leading-relaxed drop-shadow-md ${t.role === 'user' ? 'text-white/60 italic' :
                                        t.isEmergency ? 'text-red-400 font-bold' : 'text-blue-100'
                                        }`}>
                                        "{t.text}"
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Emergency Alert Overlay */}
                    {transcript.length > 0 && transcript[transcript.length - 1]?.isEmergency && (
                        <div className="absolute top-0 -mt-12 animate-bounce">
                            <span className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg shadow-red-glow">
                                ⚠️ URGENT ALERT
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 w-full p-8 flex justify-center items-center z-20 bg-gradient-to-t from-slate-900 to-transparent">
                <button
                    onMouseDown={startListening}
                    onMouseUp={stopListening}
                    // Touch events for mobile
                    onTouchStart={startListening}
                    onTouchEnd={stopListening}
                    disabled={isProcessing || isSpeaking}
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95
                        ${isListening ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}
                        ${(isProcessing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
                </button>
                <div className="absolute bottom-2 text-xs text-white/40">
                    Press & Hold to Speak
                </div>
            </div>
        </div>
    );
};

export default HealthBuddy;
