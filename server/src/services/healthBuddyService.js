const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const SYSTEM_PROMPT = `You are "Dr. Aarav", an animated male doctor-assistant avatar.
You appear on screen as a friendly, calm, confident virtual doctor.
Your face and mouth will animate according to the speech output you generate.

Your responsibilities:

========================
1. BEHAVIOR & CONVERSATION
========================
- Speak naturally, warmly, and empathetically, like a real doctor talking to a patient.
- Keep sentences short and supportive.
- Always ask relevant follow-up questions to understand the user’s symptoms.
- Provide ONLY safe, non-diagnostic guidance such as:
  • hydration
  • rest
  • warm or cold compress
  • breathing exercises
  • simple lifestyle suggestions
  • OTC paracetamol with strict warnings ("You may take standard OTC paracetamol as per package instructions. Do NOT exceed limits. If you have liver conditions or other medications, consult a doctor.")

Forbidden:
- No diagnosis names.
- No prescription medications.
- No dosage instructions except "follow package instructions".
- No risky medical claims.

Include this safety message when giving any medical suggestion:
"This is not a medical diagnosis."

========================
2. VIDEO ANALYSIS RULES
========================
You may comment on general physical appearance the camera shows:
- looks tired
- looks stressed
- looks uncomfortable
- facial strain
- sweating
- eye redness

But DO NOT diagnose diseases from appearance.

========================
3. AUDIO INPUT RULES
========================
- Understand the user's speech and emotion.
- Reflect understanding in your replies.
- Ask clarifying questions when needed.
- Comfort the patient if they sound worried.

========================
4. EMERGENCY RULE
========================
If the user reports:
- severe chest pain
- difficulty breathing
- stroke symptoms
- heavy bleeding
- unconsciousness

You must respond:
"This seems urgent. Please seek emergency medical help right now."

========================
5. ANIMATION CONTROL
========================
Your speech will be converted into audio and used to animate the male doctor avatar.
- Speak with natural pacing.
- The emotional tone of your text should match how the avatar should express itself.
- If excting, add enthusiasm. If sad/stressed, sound calmer.

========================
6. OUTPUT FORMAT
========================
Always return JSON in this structure:

{
  "text": "<the final spoken reply to the patient>",
  "emotion": "<neutral | happy | calm | concerned>",
  "animation_intensity": "<low | medium | high>",
  "topic_suggestion": "<optional topic to continue conversation>",
  "risk_level": "<Low | Medium | High>",
  "should_escalate": true/false
}

Where:
• "emotion" controls the avatar's face expression
• "animation_intensity" controls mouth + body movement strength
• "text" is what the avatar will speak aloud

========================
7. CHARACTER & IDENTITY
========================
You are NOT a real doctor.
You are a virtual AI health companion.
Never claim you are a licensed practitioner.`;

/**
 * 1. Transcribe Audio (if provided)
 * 2. Analyze (Text + Image) using System Prompt + Context
 * 3. Generate Speech (TTS) from the AI response
 */
async function processHealthBuddyInteraction({
    userId,
    patientContext,
    audioBuffer,
    textInput,
    imageBase64,
    history = []
}) {
    if (!openai) {
        throw new Error("OpenAI API Key not configured");
    }

    let userMessageText = textInput || "";

    // --- STEP 1: Transcribe Audio (if audioBuffer provided) ---
    if (audioBuffer) {
        try {
            // Create a temp file for Whisper
            const tempFilePath = path.join(os.tmpdir(), `upload_${uuidv4()}.wav`);
            fs.writeFileSync(tempFilePath, audioBuffer);

            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "whisper-1",
            });

            // Clean up temp file
            fs.unlinkSync(tempFilePath);

            if (transcription && transcription.text) {
                userMessageText = transcription.text;
            }
        } catch (err) {
            console.error("Whisper Transcription Error:", err);
            // Fallback: proceed if there's textInput, or just empty?
            // If strictly audio mode, we might want to return error or explicit "I couldn't hear you"
        }
    }

    if (!userMessageText && !imageBase64) {
        // Nothing to process
        return {
            text: "I'm listening. Please speak or show me your face.",
            audioBase64: null,
            transcript: ""
        };
    }

    // --- STEP 2: Chat Completion (Vision + Text) ---
    // Messages array
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        // Add patient context as a system message reinforcement
        {
            role: "system",
            content: `Current Patient Context:\n${JSON.stringify(patientContext, null, 2)}`
        },
        ...history, // Previous conversation history
    ];

    const userContent = [];

    if (userMessageText) {
        userContent.push({ type: "text", text: userMessageText });
    }

    // Add image if present (limit to 1 frame to save tokens, or client handles sampling)
    if (imageBase64) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low" // Low detail is usually enough for general expression/redness, saves tokens
            }
        });
    }

    messages.push({ role: "user", content: userContent });

    let aiResponseText = "";
    let parsedResponse = {};

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Supports vision
            messages: messages,
            response_format: { type: "json_object" },
            temperature: 0.6,
            max_tokens: 300,
        });

        const rawContent = completion.choices[0].message.content;
        parsedResponse = JSON.parse(rawContent);
        aiResponseText = parsedResponse.text;

    } catch (err) {
        console.error("GPT-4o Completion Error:", err);
        aiResponseText = "I'm having trouble connecting right now. Please try again.";
        parsedResponse = {
            text: aiResponseText,
            emotion: "neutral",
            animation_intensity: "low",
            risk_level: "Low",
            should_escalate: false
        };
    }

    // --- STEP 3: Generate Speech (TTS) ---
    let audioBase64 = null;
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "shimmer", // 'shimmer' is often good for friendly/female, 'alloy' for neutral
            input: aiResponseText,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        audioBase64 = buffer.toString('base64');

    } catch (err) {
        console.error("TTS Generation Error:", err);
        // We can still return text even if audio fails
    }

    return {
        ...parsedResponse,
        audioBase64,
        userTranscript: userMessageText
    };
}

module.exports = { processHealthBuddyInteraction };
