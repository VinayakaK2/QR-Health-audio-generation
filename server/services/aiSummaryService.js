const OpenAI = require('openai');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Helper to extract text from PDF
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text.substring(0, 10000); // Limit text to avoid token limits
    } catch (error) {
        console.error("PDF Extraction Error:", error.message);
        return "Error extracting text from report.";
    }
}

async function generatePatientSummary(patient, reportFilePath = null) {
    if (!openai) {
        console.log("Skipping AI Summary: No API Key");
        return null; // Fail gracefully
    }

    try {
        console.log(`Generating AI Summary for ${patient.name}...`);

        // 1. Prepare Patient Context
        // Helper to clean arrays (remove "None", empty strings)
        const cleanArray = (arr) => {
            if (!arr || !Array.isArray(arr)) return [];
            return arr.filter(item => item && item !== "None" && item.trim() !== "");
        };

        const patientContext = {
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            allergies: cleanArray(patient.allergies),
            conditions: cleanArray(patient.medicalConditions),
            medications: cleanArray(patient.medications),
            riskLevel: patient.riskLevel,
            emergencyContact: patient.emergencyContact ? "Present" : "Missing"
        };

        const patientJson = JSON.stringify(patientContext, null, 2);

        // 2. Prepare Report Content
        let reportContent = "No recent medical report provided.";
        if (reportFilePath && fs.existsSync(reportFilePath)) {
            const ext = path.extname(reportFilePath).toLowerCase();
            if (ext === '.pdf') {
                reportContent = await extractTextFromPDF(reportFilePath);
            } else {
                reportContent = "[Image Report - Text extraction not supported in summary service]";
            }
        }

        // 3. Construct Prompt (USER PROVIDED STRUCTURE)
        const systemPrompt = `You are Smart QR Health's clinical assistant AI. You will receive a JSON object containing one patient’s data and possibly the extracted text of their medical report. Your job is to analyze the data and RETURN ONLY ONE JSON OBJECT that EXACTLY MATCHES the schema below. 

OUTPUT SCHEMA (must match exactly):
{
  "aiSummary": "<2-4 sentence patient-friendly summary>",
  "aiRiskLevel": "Low | Medium | High",
  "aiKeyIssues": ["<string>", "..."],
  "aiLifestyleAdvice": ["<string>", "..."],
  "aiAnalysis": {
    "reportType": "<string or 'General Profile'>",
    "parameters": [
      {
        "name": "<string>",
        "value": "<string|number>",
        "unit": "<string>",
        "normalRange": "<string>",
        "status": "LOW | NORMAL | HIGH"
      }
    ],
    "notes": "<string>"
  },
  "aiUpdatedAt": "<ISO8601 timestamp>"
}

RULES:
- If a medical report IS provided, base your analysis primarily on that.
- If NO medical report is provided (or it says "No recent medical report"), you MUST generate the analysis based on the patient's PROFILE (Age, Gender, Conditions, Medications, Allergies). Do NOT return "Unavailable".
- If the patient has no specific conditions/medications/reports, provide general healthy lifestyle advice for their age/gender group.
- aiSummary must be patient-friendly, simple English.
- aiKeyIssues must list abnormal values (status ≠ NORMAL) OR known conditions/allergies.
- aiLifestyleAdvice must be actionable, short, and patient-facing.
- If you cannot confidentally produce specific parameters, return an empty list for "parameters".`;

        const userPrompt = `PATIENT DATA (JSON):
${patientJson}

REPORT CONTENT:
${reportContent}

Now analyze and return ONLY the JSON object in the exact schema above.`;

        // 4. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 1500
        });

        const responseText = completion.choices[0].message.content;

        // 5. Parse and Return
        const parsedData = JSON.parse(responseText);

        // Ensure timestamp is set
        parsedData.aiUpdatedAt = new Date().toISOString();

        return {
            success: true,
            data: parsedData
        };

    } catch (error) {
        console.error("AI Summary Service Error:", error.message);
        return { success: false, error: error.message };
    }
}

// Helper to determine next retry interval
function getNextRetryDate(retryCount) {
    const now = new Date();
    if (retryCount === 0) return new Date(now.getTime() + 2 * 60000); // 2 mins
    if (retryCount === 1) return new Date(now.getTime() + 5 * 60000); // 5 mins
    return new Date(now.getTime() + 10 * 60000); // 10 mins thereafter
}

// Public wrapper to handle DB updates and Retries
async function processPatientJob(patientId) {
    const Patient = require('../models/Patient');
    const Report = require('../models/Report');

    console.log(`Processing AI Job for Patient: ${patientId}`);

    try {
        const patient = await Patient.findById(patientId);
        if (!patient) return;

        // Fetch latest report
        const latestReport = await Report.findOne({ patient: patientId, reportFileUrl: { $ne: '' } }).sort({ reportDate: -1 });
        let reportFilePath = null;
        if (latestReport && latestReport.reportFileUrl) {
            // Assume uploads dir is ../uploads relative to this service file? 
            // Service is in server/services. Uploads is server/uploads. ../uploads is correct.
            const fileName = latestReport.reportFileUrl.split('/').pop();
            reportFilePath = path.join(__dirname, '../uploads', fileName);
        }

        // Call Core Generation
        const aiResult = await generatePatientSummary(patient, reportFilePath);

        if (aiResult.success && aiResult.data) {
            // SUCCESS
            const data = aiResult.data;

            await Patient.findByIdAndUpdate(patientId, {
                $set: {
                    aiSummary: data.aiSummary,
                    aiRiskLevel: data.aiRiskLevel,
                    aiKeyIssues: data.aiKeyIssues,
                    aiLifestyleAdvice: data.aiLifestyleAdvice,
                    aiAnalysis: data.aiAnalysis,
                    hasAIAnalysis: true,
                    aiUpdatedAt: new Date(),
                    aiLastUpdatedAt: new Date(),
                    aiGenStatus: 'SUCCESS',
                    aiNextRetryAt: null, // Clear retry
                    aiRetryCount: 0
                }
            });
            console.log(`✅ AI Summary Generated & Saved for ${patient.name}`);
        } else {
            throw new Error(aiResult.error || "Unknown AI Error");
        }

    } catch (error) {
        console.error(`❌ AI Processing Failed for ${patientId}:`, error.message);

        // SCHEDULE RETRY
        const Patient = require('../models/Patient'); // Re-require if scope issue, but locally defined above is fine.
        const p = await Patient.findById(patientId);
        if (p) {
            const currentCount = p.aiRetryCount || 0;
            const nextRetry = getNextRetryDate(currentCount);

            await Patient.findByIdAndUpdate(patientId, {
                $set: {
                    aiGenStatus: 'FAILED',
                    aiRetryCount: currentCount + 1,
                    aiNextRetryAt: nextRetry
                }
            });
            console.log(`🔄 Scheduled Retry #${currentCount + 1} at ${nextRetry.toISOString()}`);
        }
    }
}

module.exports = { generatePatientSummary, processPatientJob };
