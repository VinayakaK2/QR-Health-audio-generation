const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const Patient = require('../models/Patient');
const PatientEditRequest = require('../models/PatientEditRequest');
const { authMiddleware } = require('../middleware/auth');
const { generatePatientSummary } = require('../services/aiSummaryService');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// @route   GET /api/patients
// @desc    Get all patients (filtered by hospital for HOSPITAL_ADMIN)
// @access  Protected
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        let filter = {};

        // Hospital admins can only see their own patients
        if (req.userRole === 'HOSPITAL_ADMIN') {
            if (!req.userHospital) {
                return res.status(400).json({
                    success: false,
                    message: 'No hospital associated with this account'
                });
            }
            filter.hospital = req.userHospital;
        }

        const patients = await Patient.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: patients.length,
            patients
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/patients/:id
// @desc    Get single patient
// @access  Protected
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        let filter = { _id: req.params.id };

        // Hospital admins can only see their own patients
        if (req.userRole === 'HOSPITAL_ADMIN') {
            filter.hospital = req.userHospital;
        }

        const patient = await Patient.findOne(filter);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.json({
            success: true,
            patient
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/patients
// @desc    Create new patient
// @access  Protected
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        console.log('Create Patient Request Body:', req.body); // DEBUG LOG
        console.log('User Role:', req.userRole); // DEBUG LOG
        console.log('User Hospital:', req.userHospital); // DEBUG LOG

        // For hospital admins, automatically set the hospital
        let patientData = req.body;
        if (req.userRole === 'HOSPITAL_ADMIN') {
            if (!req.userHospital) {
                return res.status(400).json({
                    success: false,
                    message: 'No hospital associated with this account'
                });
            }
            patientData.hospital = req.userHospital;
        }

        // Check if email already exists
        if (patientData.email) {
            const existingPatient = await Patient.findOne({ email: patientData.email });
            if (existingPatient) {
                return res.status(400).json({
                    success: false,
                    message: 'Patient with this email already exists'
                });
            }
        }

        const patient = new Patient(patientData);
        await patient.save();

        // Generate QR code
        const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/emergency/${patient.qrToken}`;
        const qrFileName = `qr-${patient.qrToken}.png`;
        const qrFilePath = path.join(uploadsDir, qrFileName);

        await QRCode.toFile(qrFilePath, qrData, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Update patient with QR code URL
        patient.qrCodeUrl = `/uploads/${qrFileName}`;

        // Generate AI Summary
        try {
            const summary = await generatePatientSummary(patient);
            if (summary) {
                patient.aiSummary = summary;
                patient.aiLastUpdatedAt = new Date();
            }
        } catch (error) {
            console.error("AI summary generation failed:", error.message);
        }

        await patient.save();

        res.status(201).json({
            success: true,
            message: 'Patient created successfully',
            patient
        });
    } catch (error) {
        console.error('Create Patient Error:', error); // DEBUG LOG
        next(error);
    }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Protected
router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
        let filter = { _id: req.params.id };

        // Hospital admins can only update their own patients
        if (req.userRole === 'HOSPITAL_ADMIN') {
            filter.hospital = req.userHospital;
        }

        const patient = await Patient.findOne(filter);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Update fields (except qrToken and hospital)
        const { qrToken, hospital, ...updateData } = req.body;

        // CRITICAL FIX: Remove sensitive fields if they are empty/null to prevent overwriting existing data
        if (!updateData.password) {
            delete updateData.password;
        }

        // Ensure we don't accidentally wipe face descriptor with empty data
        if (updateData.faceDescriptor && updateData.faceDescriptor.length === 0) {
            delete updateData.faceDescriptor;
        }

        // If HOSPITAL_ADMIN, create edit request instead of updating directly
        if (req.userRole === 'HOSPITAL_ADMIN') {
            const editRequest = new PatientEditRequest({
                patient: patient._id,
                hospital: req.userHospital,
                requestedChanges: updateData,
                status: 'PENDING'
            });
            await editRequest.save();

            return res.json({
                success: true,
                message: 'Update request sent to Admin for approval',
                requestPending: true
            });
        }

        // If SUPER_ADMIN, update directly
        Object.assign(patient, updateData);

        // Generate AI Summary on update
        try {
            const summary = await generatePatientSummary(patient);
            if (summary) {
                patient.aiSummary = summary;
                patient.aiLastUpdatedAt = new Date();
            }
        } catch (error) {
            console.error("AI summary generation failed:", error.message);
        }

        await patient.save();

        res.json({
            success: true,
            message: 'Patient updated successfully',
            patient
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient
// @access  Protected
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        let filter = { _id: req.params.id };

        // Hospital admins can only delete their own patients
        if (req.userRole === 'HOSPITAL_ADMIN') {
            filter.hospital = req.userHospital;
        }

        const patient = await Patient.findOne(filter);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Delete QR code file if exists
        if (patient.qrCodeUrl) {
            const qrFilePath = path.join(__dirname, '..', patient.qrCodeUrl);
            await fs.unlink(qrFilePath).catch(console.error);
        }

        await Patient.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Patient deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
