const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiTextModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// Note: For TTS, we use a specific model or endpoint configuration

const chatHistory = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected to AI Avatar Chat:', socket.id);

        // Initialize history for this session
        if (!chatHistory.has(socket.id)) {
            chatHistory.set(socket.id, [
                { role: "system", content: "You are a friendly, calm, and empathetic virtual doctor assistant. Keep your responses concise (max 2 sentences). Do NOT provide medical diagnoses. Always advise consulting a real doctor for serious concerns. Speak as if you are a 3D avatar talking to a patient." }
            ]);
        }

        socket.on('user_message', async (data) => {
            const { message } = data;
            console.log(`Received: ${message} `);

            const history = chatHistory.get(socket.id);
            history.push({ role: "user", content: message });

            let fullResponse = "";
            let usedFallback = false;

            try {
                // --- STRATEGY: TRY OPENAI FIRST ---
                const stream = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: history,
                    stream: true,
                });

                let buffer = "";
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        fullResponse += content;

                        // Emit text immediately for UI
                        socket.emit('text_chunk', { text: content });
                    }
                }

                // Generate Audio from FULL response to save quota (1 request per turn)
                if (fullResponse.trim()) {
                    await streamGeminiAudio(socket, fullResponse);
                }

                socket.emit('stream_done');

            } catch (error) {
                console.error("OpenAI Error (Switching to Gemini Fallback):", error.message);
                usedFallback = true;

                // --- FALLBACK: GEMINI TEXT GENERATION ---
                try {
                    // Convert history to Gemini format if needed, or just send last message + system prompt context
                    // Gemini SDK handles history differently (multi-turn), but for simple fallback:
                    const prompt = `System: You are a friendly, virtual doctor. Answer this: ${message}`;

                    const result = await geminiTextModel.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    fullResponse = text;

                    // Emit full text
                    socket.emit('text_chunk', { text: text });
                    // Generate audio for full text
                    await streamGeminiAudio(socket, text);
                    socket.emit('stream_done');

                } catch (geminiError) {
                    console.error("Gemini Fallback Error:", geminiError);
                    socket.emit('error', { message: "I'm having trouble thinking right now." });
                }
            }

            // Save response to history
            if (fullResponse) {
                history.push({ role: "assistant", content: fullResponse });
                if (history.length > 20) {
                    const newHistory = [history[0], ...history.slice(-19)];
                    chatHistory.set(socket.id, newHistory);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            chatHistory.delete(socket.id);
        });
    });
};

/**
 * Generates Audio using Gemini TTS and emits 'audio_chunk'
 */
async function streamGeminiAudio(socket, text) {
    if (!text || text.trim().length === 0) return;

    // const voices = ["Puck", "Kore", "Fenrir", "Leda"];
    // const selectedVoice = voices[Math.floor(Math.random() * voices.length)]; 

    try {
        console.log(`Generating Gemini Audio: "${text.substring(0, 20)}..."`);

        // Use the Speech endpoint via REST/SDK (using fetch as SDK for speech might be experimental or explicit)
        // Using the user's provided docs logic:
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: "Zephyr" // Fixed voice for consistency
                                }
                            }
                        }
                    }
                })
            }
        );

        const data = await response.json();

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].inlineData) {
            const rawPcmBase64 = data.candidates[0].content.parts[0].inlineData.data;

            // CONVERT RAW PCM TO WAV
            // Gemini returns raw PCM (s16le, 24kHz, 1 channel)
            const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
            const wavBuffer = addWavHeader(pcmBuffer, 24000, 1, 16);
            const wavBase64 = wavBuffer.toString('base64');

            console.log(`✅ Gemini Audio Generated (${wavBuffer.length} bytes) -> Emitting`);
            socket.emit('audio_chunk', { audio: wavBase64, text: text });
        } else {
            console.error("Gemini TTS: No audio candidate found", JSON.stringify(data));
        }

    } catch (error) {
        console.error("Gemini TTS Generation Error:", error);
    }
}

/**
 * Adds a WAV header to raw PCM data.
 * Specs based on Gemini: 24kHz, 1 Channel, 16-bit Little Endian.
 */
function addWavHeader(pcmData, sampleRate, numChannels, bitDepth) {
    const header = Buffer.alloc(44);
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = pcmData.length;
    const totalSize = 36 + dataSize;

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(totalSize, 4);
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
}
