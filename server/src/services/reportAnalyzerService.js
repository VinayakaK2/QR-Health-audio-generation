const OpenAI = require('openai');
const fs = require('fs');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Function to analyze PDF report using OpenAI File API
async function analyzeReportWithOpenAI(filePath, mimeType) {
    if (!openai) {
        console.log("OpenAI API Key missing, returning unavailable status.");
        return getUnavailableData();
    }

    try {
        // For PDFs, use OpenAI File API
        if (mimeType === 'application/pdf') {
            console.log("DEBUG: Uploading PDF to OpenAI...");

            // Upload the file to OpenAI
            const file = await openai.files.create({
                file: fs.createReadStream(filePath),
                purpose: "assistants"
            });

            console.log("DEBUG: PDF uploaded. File ID:", file.id);
            console.log("DEBUG: Analyzing with GPT-4o-mini...");

            // Create a chat completion with the file
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a medical report analysis AI. Analyze the uploaded medical report PDF and extract:
1) reportType (CBC, Lipid, Thyroid, KFT, LFT, Sugar, etc.)
2) parameters: array of { name, value, unit, normalRange, status (LOW/NORMAL/HIGH) }
3) summary: 3-5 sentence patient-friendly summary
4) riskLevel: Low | Medium | High
5) lifestyleAdvice: array of 4-6 actionable recommendations

Return STRICT JSON only:
{
  "reportType": "...",
  "parameters": [{"name": "...", "value": 0, "unit": "mg/dL", "normalRange": "70-110", "status": "HIGH"}],
  "summary": "...",
  "riskLevel": "Low",
  "lifestyleAdvice": ["...", "..."]
}`
                    },
                    {
                        role: "user",
                        content: `Analyze this medical report PDF (file ID: ${file.id}). Provide detailed analysis in the exact JSON format specified.`
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
                max_tokens: 2000
            });

            const responseText = completion.choices[0].message.content;
            console.log("DEBUG: OpenAI analysis received. Length:", responseText.length);

            const parsedData = JSON.parse(responseText);

            // Validate required fields
            if (!parsedData.reportType || !parsedData.summary || !parsedData.riskLevel) {
                console.error("Invalid AI response structure");
                return getUnavailableData();
            }

            // Clean up - delete the uploaded file
            try {
                await openai.files.del(file.id);
                console.log("DEBUG: Cleaned up uploaded file");
            } catch (delErr) {
                console.warn("Could not delete file:", delErr.message);
            }

            return parsedData;

        } else if (mimeType.startsWith('image/')) {
            // For images, use vision directly
            console.log("DEBUG: Analyzing image with GPT-4o-mini vision...");

            const imageBuffer = fs.readFileSync(filePath);
            const base64Image = imageBuffer.toString('base64');

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a medical report analysis AI. Analyze medical report images and extract:
1) reportType (CBC, Lipid, Thyroid, KFT, LFT, Sugar, etc.)
2) parameters: array of { name, value, unit, normalRange, status }
3) summary: 3-5 sentence patient-friendly summary
4) riskLevel: Low | Medium | High
5) lifestyleAdvice: array of 4-6 recommendations

Return STRICT JSON only.`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this medical report and provide analysis in JSON format as specified."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
                max_tokens: 2000
            });

            const responseText = completion.choices[0].message.content;
            console.log("DEBUG: Image analysis received. Length:", responseText.length);

            const parsedData = JSON.parse(responseText);

            if (!parsedData.reportType || !parsedData.summary || !parsedData.riskLevel) {
                console.error("Invalid AI response structure");
                return getUnavailableData();
            }

            return parsedData;
        }

        return getUnavailableData();

    } catch (err) {
        console.error("OpenAI analysis error:", err.message);
        return getUnavailableData();
    }
}

function getUnavailableData() {
    return {
        reportType: "Analysis Unavailable",
        parameters: [],
        summary: "AI summary is temporarily unavailable due to a server issue. Please try again later.",
        riskLevel: "Low",
        lifestyleAdvice: []
    };
}

module.exports = { analyzeReportWithOpenAI };
