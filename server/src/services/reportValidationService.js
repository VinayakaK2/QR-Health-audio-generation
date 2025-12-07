const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

async function analyzeReportsForPatient(patient, reports, uploadedFilesMeta) {
    if (!openai) {
        return {
            missingReports: [],
            suspiciousReports: [],
            notes: "AI validation not available (no API key configured)."
        };
    }

    try {
        const prompt = `You are a medical AI assistant helping hospital staff validate report uploads.
        
Patient Profile:
- Age: ${patient.age}
- Gender: ${patient.gender}
- Conditions: ${patient.medicalConditions.join(', ')}
- Medications: ${patient.medications.join(', ')}
- Risk Level: ${patient.riskLevel}

Existing Reports:
${reports.map(r => `- ${r.reportType}: ${r.title} (${new Date(r.reportDate).toLocaleDateString()})`).join('\n')}

Files Being Uploaded Now:
${uploadedFilesMeta.map(f => `- ${f.fileName} (${f.mimeType})`).join('\n')}

Task:
1. Identify if any CRITICAL reports are missing based on the patient's conditions and risk level (e.g., Diabetic patient missing recent HbA1c).
2. Identify if any uploaded files look SUSPICIOUS or irrelevant (e.g., "Leg X-Ray" for a patient with only cardiac issues, or very old dates in filenames).

Return a JSON object with this EXACT structure:
{
    "missingReports": [
        { "type": "Report Type", "reason": "Why it is needed" }
    ],
    "suspiciousReports": [
        { "fileName": "Name of file", "reason": "Why it looks wrong" }
    ],
    "notes": "Brief overall assessment (max 1 sentence)"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a medical validation assistant. Always return valid JSON only." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 500
        });

        const text = completion.choices[0].message.content;
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Validation Error:", error);
        return {
            missingReports: [],
            suspiciousReports: [],
            notes: "AI validation failed. Please proceed with caution."
        };
    }
}

module.exports = { analyzeReportsForPatient };
