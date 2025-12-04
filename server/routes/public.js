const express = require('express');
const Patient = require('../models/Patient');

const router = express.Router();

// @route   GET /api/public/patient/:token
// @desc    Get patient by QR token (public access)
// @access  Public
router.get('/patient/:token', async (req, res, next) => {
    try {
        const patient = await Patient.findOne({ qrToken: req.params.token });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found. Invalid QR code.'
            });
        }

        // Return only necessary fields for emergency access
        const patientData = {
            fullName: patient.fullName,
            age: patient.age,
            gender: patient.gender,
            photoUrl: patient.photoUrl,
            bloodGroup: patient.bloodGroup,
            allergies: patient.allergies,
            medicalConditions: patient.medicalConditions,
            medications: patient.medications,
            emergencyContact: patient.emergencyContact,
            riskLevel: patient.riskLevel,
            aiSummary: patient.aiSummary,
            aiLastUpdatedAt: patient.aiLastUpdatedAt
        };

        res.json({
            success: true,
            patient: patientData
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
