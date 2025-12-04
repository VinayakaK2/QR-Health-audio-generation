require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const { generatePatientSummary } = require('../services/aiSummaryService');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }
};

const backfillSummaries = async () => {
    await connectDB();

    try {
        const patients = await Patient.find({
            $or: [
                { aiSummary: { $exists: false } },
                { aiSummary: "" },
                { aiSummary: null }
            ]
        });

        console.log(`Found ${patients.length} patients needing summaries.`);

        for (const patient of patients) {
            console.log(`Generating summary for: ${patient.fullName}...`);
            const summary = await generatePatientSummary(patient);

            if (summary) {
                patient.aiSummary = summary;
                patient.aiLastUpdatedAt = new Date();
                await patient.save();
                console.log(`✅ Saved summary for ${patient.fullName}`);
            } else {
                console.log(`⚠️ Failed to generate summary for ${patient.fullName}`);
            }

            // Add a small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('Backfill complete!');
        process.exit(0);
    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }
};

backfillSummaries();
