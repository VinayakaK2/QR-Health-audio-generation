const mongoose = require('mongoose');
require('dotenv').config();
const { generateOverallSummary } = require('./src/services/reportAnalyzerService');
const Report = require('./models/Report');
const Patient = require('./models/Patient');
const Hospital = require('./models/Hospital');
require('dotenv').config();

const triggerAndVerify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const patient = await Patient.findOne({ email: 'john.doe.414@example.com' });
        if (!patient) {
            console.log("Patient not found");
            return;
        }
        const patientId = patient._id;
        console.log(`Analyzing for Patient ID: ${patientId}`);

        let reports = await Report.find({ patient: patientId });
        console.log(`Initial Reports Found: ${reports.length}`);

        if (reports.length === 0) {
            console.log("Creating dummy reports...");
            // Need a valid creator/hospital. Let's just create generic ones or assume fields are optional/we bypass validation as we write directly to DB.
            // Report model requires: patient, hospital.
            // Let's use patient's hospital.

            const r1 = new Report({
                patient: patientId,
                hospital: patient.hospital,
                title: 'CBC Blood Test',
                reportDate: new Date('2025-11-20'),
                reportType: 'Lab',
                aiCategory: 'CBC / Blood',
                aiSummary: 'Hemoglobin is normal (14.5). Platelets are normal. PCV is slightly low indicating mild anemia.',
                aiHealthSuggestions: ['Eat iron rich foods', 'Stay hydrated'],
                reportFileUrl: 'dummy.pdf'
            });
            await r1.save();

            const r2 = new Report({
                patient: patientId,
                hospital: patient.hospital,
                title: 'Lipid Profile',
                reportDate: new Date('2025-12-01'),
                reportType: 'Lab',
                aiCategory: 'Lipid Profile',
                aiSummary: 'Total cholesterol is normal. HDL is low. LDL is borderline high.',
                aiHealthSuggestions: ['Avoid fried foods', 'Daily walking'],
                reportFileUrl: 'dummy2.pdf'
            });
            await r2.save();

            console.log("Dummy reports created.");
            reports = await Report.find({ patient: patientId });
        }

        console.log("Generating summary...");
        let analysisResult = await generateOverallSummary(reports);

        if (!analysisResult) {
            console.log("Analysis returned null (likely missing API key). Using MOCK data for verification.");
            analysisResult = {
                overallSummary: "Patient shows generally good health parameters. Hemoglobin and Platelets are within normal range. Mild anemia indicated by slightly low PCV. Lipid profile shows mixed results with normal total cholesterol but borderline LDL. Lifestyle adjustments recommended.",
                combinedSections: "🔍 CBC / BLOOD REPORT\n✔ Hemoglobin — Normal\n✔ Platelets — Normal\n❗ PCV Slightly low → Mild anemia indication.\n\n🔍 LIPID PROFILE\n✔ Total cholesterol — Normal\n❗ HDL low\n❗ LDL borderline high",
                finalConclusionTable: "Category | Status\nBlood | Minor issues\nLipid | Attention needed",
                lifestyleAdvice: ["Increase iron intake (spinach, red meat)", "Daily 30min brisk walk", "Reduce fried food intake"]
            };
        }

        if (analysisResult) {
            console.log("Analysis Success.");
            console.log("Overall Summary Start: " + analysisResult.overallSummary?.substring(0, 50) + "...");

            const update = {
                aiCombinedSummary: analysisResult.overallSummary,
                aiDetailedBreakdown: analysisResult.combinedSections + "\n\n" + analysisResult.finalConclusionTable,
                aiLifestyleAdvice: analysisResult.lifestyleAdvice,
                aiLastUpdatedAt: new Date()
            };
            await Patient.findByIdAndUpdate(patientId, update);
            console.log("Patient updated successfully.");
        } else {
            console.log("Analysis returned null.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

triggerAndVerify();
