const OpenAI = require('openai');

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

async function generatePatientSummary(patient) {
    if (!openai) {
        console.warn("OPENAI_API_KEY not set – skipping AI summary.");
        return "";
    }

    const {
        fullName,
        age,
        gender,
        bloodGroup,
        allergies = [],
        medicalConditions = [],
        medications = [],
        riskLevel,
        emergencyContact,
    } = patient;

    const conditions = medicalConditions;
    const emergencyContactName = emergencyContact?.name || "Not provided";
    const emergencyContactPhone = emergencyContact?.phone || "Not provided";

    const prompt = `Create a short emergency-medical summary for a patient based on the following data.

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
- Do not invent or assume information.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a medical assistant that creates concise emergency summaries for healthcare providers." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 200
        });

        const text = completion.choices[0].message.content;
        return text;
    } catch (error) {
        console.error("OpenAI summary generation failed:", error.message);
        return "";
    }
}

module.exports = { generatePatientSummary };
