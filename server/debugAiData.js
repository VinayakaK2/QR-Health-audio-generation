require('dotenv').config();
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
const fs = require('fs');
const path = require('path');

const checkPatient = async () => {
    try {
        await connectDB();

        const email = 'john.doe.330@example.com';
        const patient = await Patient.findOne({ email });

        let output = '';
        if (!patient) {
            output = '❌ Patient not found: ' + email;
        } else {
            output += '✅ Patient Found: ' + patient.fullName + '\n';
            output += '--- Medical Data ---\n';
            output += 'Allergies: ' + JSON.stringify(patient.allergies || []) + '\n';
            output += 'Conditions: ' + JSON.stringify(patient.medicalConditions || []) + '\n';
            output += 'Medications: ' + JSON.stringify(patient.medications || []) + '\n';
            output += '--- AI Data Status ---\n';
            output += 'hasAIAnalysis: ' + patient.hasAIAnalysis + '\n';
            output += 'aiRiskLevel: ' + patient.aiRiskLevel + '\n';
            output += 'aiSummary: ' + (patient.aiSummary || 'NULL') + '\n';
            output += 'aiKeyIssues: ' + JSON.stringify(patient.aiKeyIssues) + '\n';
            output += 'aiLifestyleAdvice: ' + JSON.stringify(patient.aiLifestyleAdvice) + '\n';
            output += 'aiAnalysis Object Keys: ' + (patient.aiAnalysis ? JSON.stringify(Object.keys(patient.aiAnalysis)) : 'NULL') + '\n';
        }

        fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), output);
        console.log('Debug output written to debug_output.txt');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPatient();
