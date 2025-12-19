require('dotenv').config();
const connectDB = require('./config/db');
const Patient = require('./models/Patient');
const { processPatientJob } = require('./services/aiSummaryService');

const forceUpdate = async () => {
    try {
        await connectDB();

        const email = 'john.doe.330@example.com';
        const patient = await Patient.findOne({ email });

        if (!patient) {
            console.log('❌ Patient not found:', email);
        } else {
            console.log('✅ Patient Found:', patient.fullName);
            console.log('🚀 Triggering AI Job...');

            // Allow time for async processing
            await processPatientJob(patient._id);

            console.log('✅ AI Job Completed (hopefully). Checking status...');
            const updatedPatient = await Patient.findOne({ email });
            console.log('Status:', updatedPatient.aiGenStatus);
            console.log('Summary:', updatedPatient.aiSummary);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

forceUpdate();
