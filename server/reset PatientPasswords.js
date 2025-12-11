const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('./models/Patient');
require('dotenv').config();

async function resetPatientPasswords() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all patients
        const patients = await Patient.find({}).select('+password');
        console.log(`\nFound ${patients.length} patients\n`);

        if (patients.length === 0) {
            console.log('⚠️  No patients found in database');
            await mongoose.connection.close();
            return;
        }

        const passwordToSet = 'patient123';
        const hashedPassword = await bcrypt.hash(passwordToSet, 10);

        let successCount = 0;
        for (const patient of patients) {
            try {
                console.log(`Updating: ${patient.email}`);

                patient.password = hashedPassword;
                await patient.save();

                console.log(`✅ Password set for ${patient.email}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to update ${patient.email}:`, err.message);
            }
        }

        console.log(`\n✅ Updated ${successCount}/${patients.length} patient passwords`);
        console.log('\nAll patients can now login with:');
        console.log('Email: <patient-email>');
        console.log('Password: patient123');

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

resetPatientPasswords();
