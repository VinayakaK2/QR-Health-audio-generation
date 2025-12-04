const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generatePatientSummary(patient) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not set – skipping AI summary.");
        return "";
    }

    const {
        fullName,
        age,
        gender,
        bloodGroup,
        allergies = [],
        medicalConditions = [], // Map medicalConditions to conditions for the prompt
        medications = [],
        riskLevel,
        emergencyContact,
    } = patient;

    const conditions = medicalConditions;
    const emergencyContactName = emergencyContact?.name || "Not provided";
    const emergencyContactPhone = emergencyContact?.phone || "Not provided";

    const prompt = `
Create a short emergency-medical summary for a patient based on the following data.

Name: ${fullName}
Age: ${age}
Gender: ${gender}
Blood group: ${bloodGroup}
Risk Level: ${riskLevel}
Allergies: ${allergies.length ? allergies.join(", ") : "None"}
Medical Conditions: ${conditions.length ? conditions.join(", ") : "None"}
Medications: ${medications.length ? medications.join(", ") : "None"}
Emergency Contact: ${emergencyContactName} (${emergencyContactPhone})

Instructions:
- Keep 4 to 6 lines maximum.
- Prioritize risk, allergies, and critical conditions.
- Use clear language suitable for emergency doctors.
- If applicable, include critical instructions (e.g., avoid NSAIDs).
- Do not invent or assume information.
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Gemini AI summary generation failed:", error.message);
        return "";
    }
}

module.exports = { generatePatientSummary };
