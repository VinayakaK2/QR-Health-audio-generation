const mongoose = require('mongoose');
const Patient = require('./models/Patient');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const patient = await Patient.findOne({ email: 'john.doe.414@example.com' });
        if (patient) {
            console.log(`Patient ID: ${patient._id}`);
        } else {
            console.log('Patient not found');
        }
    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
});
