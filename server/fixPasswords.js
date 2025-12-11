const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('./models/Patient');
require('dotenv').config();

async function resetPatientPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const patients = await Patient.find({}).select('+password');
        console.log('Found', patients.length, 'patients');

        if (patients.length === 0) {
            console.log('No patients found');
            await mongoose.connection.close();
            return;
        }

        const hashedPassword = await bcrypt.hash('patient123', 10);

        for (const patient of patients) {
            console.log('Updating:', patient.email);
            patient.password = hashedPassword;
            await patient.save();
            console.log('Done:', patient.email);
        }

        console.log('All patients updated! Password is: patient123');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

resetPatientPasswords();
