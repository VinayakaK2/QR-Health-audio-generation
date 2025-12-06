const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Report = require('./models/Report');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const id = '675347cb1f725e335fd5a1706';
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('Invalid ObjectID');
            return;
        }

        const patient = await Patient.findById(id);
        if (patient) {
            console.log(`Patient Found: ${patient.fullName}`);
        } else {
            console.log('Patient NOT found');
        }

        const reports = await Report.find({ patient: id });
        console.log(`Reports Found: ${reports.length}`);

        if (reports.length > 0) {
            console.log('First report title:', reports[0].title);
        }

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
});
