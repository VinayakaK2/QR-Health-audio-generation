const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
            console.log(`Received: ${message}`);

            try {
                // Get history
                const history = chatHistory.get(socket.id);
                history.push({ role: "user", content: message });

                // Initialize stream response
                const stream = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: history, // Send full history
                    stream: true,
                });

                let buffer = "";
                let fullResponse = ""; // Track full response for history

                // Process stream
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        buffer += content;
                        fullResponse += content;

                        // Check for sentence boundaries
                        // We look for punctuation that ends a sentence (. ? !) AND a space or end of string
                        // This uses a regex to find the first split point
                        const sentenceMatch = buffer.match(/([.?!])\s+/);

                        if (sentenceMatch) {
                            const splitIndex = sentenceMatch.index + sentenceMatch[0].length;
                            const sentence = buffer.substring(0, splitIndex).trim();
                            buffer = buffer.substring(splitIndex); // Keep remainder

                            if (sentence.length > 0) {
                                // Send text chunk for UI immediately
                                socket.emit('text_chunk', { text: sentence });

                                // Generate and stream audio for this sentence
                                await streamAudio(socket, sentence);
                            }
                        }
                    }
                }

                // Process remaining buffer
                if (buffer.trim().length > 0) {
                    socket.emit('text_chunk', { text: buffer });
                    await streamAudio(socket, buffer);
                }

                // Save Assistant response to history
                history.push({ role: "assistant", content: fullResponse });

                // Limit history to last 20 messages to save memory/tokens
                if (history.length > 20) {
                    // Keep system prompt [0] + last 19
                    const newHistory = [history[0], ...history.slice(-19)];
                    chatHistory.set(socket.id, newHistory);
                }

                socket.emit('stream_done');

            } catch (error) {
                console.error("AI Error:", error);
                socket.emit('error', { message: "I'm having trouble thinking right now." });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            chatHistory.delete(socket.id); // Cleanup
        });
    });
};

async function streamAudio(socket, text) {
    // DISABLE OPENAI TTS TO SAVE QUOTA
    /*
    try {
        console.log(`Generating audio for: "${text}"`);
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "shimmer",
            input: text,
            response_format: "mp3", // We'll get a buffer
        });

        const arrayBuffer = await mp3.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Emit binary data directly or base64
        // Base64 is safer for simple socket.io setups without binary tweaking
        const base64Audio = buffer.toString('base64');
        socket.emit('audio_chunk', { audio: base64Audio, text: text });

    } catch (error) {
        console.error("TTS Error:", error);
    }
    */
    console.log(`Skipping audio generation for: "${text}" (Quota Saving Mode)`);
}
