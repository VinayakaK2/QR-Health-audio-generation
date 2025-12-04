import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';

const FaceCapture = ({ onCapture, label = "Scan Face" }) => {
    const videoRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Error loading face-api models:", error);
                toast.error("Failed to load face detection models");
            }
        };
        loadModels();
    }, []);

    const startVideo = () => {
        setCapturing(true);
        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => {
                console.error("Error accessing webcam:", err);
                toast.error("Could not access webcam");
                setCapturing(false);
            });
    };

    const stopVideo = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCapturing(false);
        setScanning(false);
    };

    const handleScan = async () => {
        if (!videoRef.current) return;
        setScanning(true);

        try {
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                // Convert Float32Array to normal Array for JSON serialization
                const descriptor = Array.from(detections.descriptor);
                onCapture(descriptor);
                toast.success("Face scanned successfully!");
                stopVideo();
            } else {
                toast.error("No face detected. Please position yourself clearly.");
                setScanning(false);
            }
        } catch (error) {
            console.error("Face scan error:", error);
            toast.error("Error scanning face");
            setScanning(false);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            {!capturing ? (
                <button
                    type="button"
                    onClick={startVideo}
                    disabled={!modelsLoaded}
                    className="btn-secondary flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {modelsLoaded ? label : "Loading Models..."}
                </button>
            ) : (
                <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full max-w-sm h-auto"
                        onPlay={() => { }}
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                        <button
                            type="button"
                            onClick={handleScan}
                            disabled={scanning}
                            className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 font-bold shadow-lg disabled:opacity-50"
                        >
                            {scanning ? "Scanning..." : "Capture"}
                        </button>
                        <button
                            type="button"
                            onClick={stopVideo}
                            className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 font-bold shadow-lg"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceCapture;
