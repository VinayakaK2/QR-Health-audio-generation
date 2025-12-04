const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeReportsForPatient(patient, reports, uploadedFilesMeta) {
    if (!process.env.GEMINI_API_KEY) {
        return {
            missingReports: [],
            suspiciousReports: [],
            notes: "AI validation not available (no API key configured)."
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        You are a medical AI assistant helping hospital staff validate report uploads.
        
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

        Return a JSON object with this EXACT structure (no markdown formatting):
        {
            "missingReports": [
                { "type": "Report Type", "reason": "Why it is needed" }
            ],
            "suspiciousReports": [
                { "fileName": "Name of file", "reason": "Why it looks wrong" }
            ],
            "notes": "Brief overall assessment (max 1 sentence)"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);

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
