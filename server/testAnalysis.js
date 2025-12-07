const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const { generatePatientAnalysis, extractTextFromFile } = require('./src/services/reportAnalyzerService');
const Patient = require('./models/Patient');
const Report = require('./models/Report');

const testPipeline = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // 1. Pick a real file
        const fileName = "1764836297470-894619353.pdf"; // Existing file from ls
        const filePath = path.join(__dirname, 'uploads', fileName);
        console.log(`Testing file: ${filePath}`);

        // 2. Test Extraction
        console.log("--- Extracting Text ---");
        const text = await extractTextFromFile(filePath, 'application/pdf');
        console.log(`Extracted Text Length: ${text.length}`);
        console.log(`Text Snippet: ${text.substring(0, 100)}...`);

        // 3. Test Analysis
        console.log("--- Generating Analysis ---");
        const analysis = await generatePatientAnalysis(text, filePath, 'application/pdf');

        console.log("Analysis Result:");
        console.log(JSON.stringify(analysis, null, 2));

        if (analysis) {
            // 4. Test DB Update (Simulated)
            console.log("--- Simulating DB Update ---");
            const patient = await Patient.findOne({ email: 'john.doe.414@example.com' });
            if (patient) {
                console.log(`Updating patient ${patient._id}...`);
                const updatedPatient = await Patient.findByIdAndUpdate(patient._id, {
                    $set: {
                        aiAnalysis: analysis,
                        aiSummary: analysis.overallSummary,
                        hasAIAnalysis: true,
                        aiLastUpdatedAt: new Date(),
                        riskLevel: ['High', 'Medium', 'Low'].includes(analysis.riskLevel) ? analysis.riskLevel : 'Low'
                    }
                }, { new: true });
                console.log("Update complete.");

                // Verify
                console.log("Verification - aiAnalysis present:", !!updatedPatient.aiAnalysis);
                console.log("Verification - hasAIAnalysis:", updatedPatient.hasAIAnalysis);
                console.log("Verification - riskLevel:", updatedPatient.riskLevel);
            } else {
                console.log("Patient not found for update test.");
            }
        }

    } catch (error) {
        console.error("Test Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

testPipeline();
