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
        const patient = await Patient.findOne({ email }).select('+password');

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
