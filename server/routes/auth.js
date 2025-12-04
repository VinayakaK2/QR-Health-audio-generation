const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (admin)
// @access  Public
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            role: role || 'HOSPITAL_ADMIN',
            isActive: role === 'SUPER_ADMIN' ? true : false
        });
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                hospital: user.hospital
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospital: user.hospital
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email }).populate('hospital');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active (for hospital admins)
        if (user.role === 'HOSPITAL_ADMIN' && !user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval. Please wait for the system owner to approve your hospital.'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                hospital: user.hospital?._id || null
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospital: user.hospital?._id || null,
                hospitalName: user.hospital?.name || null
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/auth/patient/login
// @desc    Login patient
// @access  Public
router.post('/patient/login', async (req, res, next) => {
    try {
        const { email, password, faceDescriptor } = req.body;
        const faceAuthService = require('../services/faceAuthService');

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if patient exists
        // Explicitly select password and faceDescriptor
        const Patient = require('../models/Patient');
        const patient = await Patient.findOne({ email }).select('+password +faceDescriptor');

        if (!patient) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if patient is active
        if (patient.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Please contact hospital admin.'
            });
        }

        // Check password
        const isPasswordValid = await patient.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Face Verification
        if (patient.faceDescriptor && patient.faceDescriptor.length > 0) {
            if (!faceDescriptor) {
                return res.status(401).json({
                    success: false,
                    message: 'Face authentication required',
                    requireFaceAuth: true
                });
            }

            try {
                const isMatch = await faceAuthService.verifyFace(patient.faceDescriptor, faceDescriptor);

                if (!isMatch) {
                    return res.status(401).json({
                        success: false,
                        message: 'Face verification failed. Face does not match.'
                    });
                }
            } catch (error) {
                console.error('Face verification error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error verifying face data'
                });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: patient._id,
                role: 'PATIENT'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: patient._id,
                name: patient.fullName,
                email: patient.email,
                role: 'PATIENT'
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
