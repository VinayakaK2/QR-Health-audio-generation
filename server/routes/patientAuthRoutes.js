const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');

const router = express.Router();

// @route   POST /api/auth/patient-login
// @desc    Patient login with email and password
// @access  Public
router.post('/patient-login', async (req, res) => {
    try {
        console.log('Patient Login Request:', req.body); // DEBUG LOG
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find patient
        // Explicitly select password to compare
        const patient = await Patient.findOne({ email }).select('+password +faceDescriptor');

        if (!patient) {
            console.log('Patient not found for email:', email);
            return res.status(400).json({
                message: `Patient not found with email: ${email}`,
                receivedEmail: email
            });
        }

        // Check if active
        if (patient.isActive === false) {
            return res.status(403).json({ message: 'Account disabled. Contact hospital.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(400).json({ message: 'Invalid password' });
        }

        // --- FACE AUTHENTICATION CHECK ---

        // 1. Check if patient is enrolled (has face data)
        const hasEnrolledFace = patient.faceDescriptor && patient.faceDescriptor.length > 0;

        if (!hasEnrolledFace) {
            return res.status(403).json({
                message: 'Face enrollment required. Please contact hospital administration to set up face login.'
            });
        }

        // 2. Check if face data is provided in request
        const { faceDescriptor } = req.body;

        if (!faceDescriptor) {
            // Client needs to perform face scan
            return res.status(403).json({
                requireFaceAuth: true,
                message: 'Face verification required'
            });
        }

        // 3. Verify Face
        const faceAuthService = require('../services/faceAuthService');
        try {
            const isFaceMatch = await faceAuthService.verifyFace(patient.faceDescriptor, faceDescriptor);

            if (!isFaceMatch) {
                return res.status(401).json({ message: 'Face verification failed. Please try again.' });
            }
        } catch (faceError) {
            console.error("Face auth error:", faceError);
            return res.status(500).json({ message: 'Error verifying face identity' });
        }

        // ---------------------------------

        // Generate Token
        const token = jwt.sign(
            {
                id: patient._id, // Standardize on 'id' to match other auth
                patientId: patient._id,
                role: 'PATIENT'
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Return response
        res.json({
            token,
            role: 'PATIENT',
            patientId: patient._id,
            name: patient.fullName,
            email: patient.email,
        });

    } catch (error) {
        console.error('Patient Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;
