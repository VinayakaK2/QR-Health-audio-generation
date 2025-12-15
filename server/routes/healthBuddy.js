const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { processHealthBuddyInteraction } = require('../src/services/healthBuddyService');
const Patient = require('../models/Patient');

// Multer setup for audio uploads (memory storage)
// Multer setup for audio uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// @route   POST /api/health-buddy/process
// @desc    Process audio/video interaction
// @access  Protected (Patient Only)
router.post('/process', authMiddleware, upload.single('audio'), async (req, res) => {
    try {
        // 1. Validate User Role
        if (req.userRole !== 'PATIENT') {
            return res.status(403).json({ success: false, message: "Only patients can access HealthBuddy." });
        }

        const patientId = req.userPatientId || req.userId;
        const audioFile = req.file; // Buffer
        const { imageBase64, history, textInput } = req.body;

        // 2. Get Patient Context
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patientContext = {
            name: patient.fullName,
            age: patient.age,
            gender: patient.gender,
            conditions: patient.medicalConditions || [],
            medications: patient.medications || [],
            allergies: patient.allergies || []
        };

        // 3. Process with Service
        const result = await processHealthBuddyInteraction({
            userId: patientId,
            patientContext,
            audioBuffer: audioFile ? audioFile.buffer : null,
            textInput,
            imageBase64, // Expecting plain base64 string without data URI prefix if possible, or handle in service? Service parses `data:image...` so strictly passing the base64 part might be better? 
            // The service code uses `data:image/jpeg;base64,${imageBase64}`, so client should send Raw Base64 or we strip prefix. 
            // Let's assume client sends Raw Base64 for simplicity, or we strip it here.
            history: history ? JSON.parse(history) : []
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("HealthBuddy Route Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
});

module.exports = router;
