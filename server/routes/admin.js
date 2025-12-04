const express = require('express');
const Patient = require('../models/Patient');
const PatientEditRequest = require('../models/PatientEditRequest');
const { authMiddleware } = require('../middleware/auth');
const { generatePatientSummary } = require('../services/aiSummaryService');

const router = express.Router();

// Middleware to ensure SUPER_ADMIN
const ensureSuperAdmin = (req, res, next) => {
    if (req.userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super Admin only.'
        });
    }
    next();
};

// @route   GET /api/admin/requests
// @desc    Get all pending edit requests
// @access  Protected (Super Admin)
router.get('/requests', authMiddleware, ensureSuperAdmin, async (req, res, next) => {
    try {
        const requests = await PatientEditRequest.find({ status: 'PENDING' })
            .populate('patient') // Populate full patient details
            .populate('hospital', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/admin/requests/count
// @desc    Get count of pending edit requests
// @access  Protected (Super Admin)
router.get('/requests/count', authMiddleware, ensureSuperAdmin, async (req, res, next) => {
    try {
        const count = await PatientEditRequest.countDocuments({ status: 'PENDING' });
        res.json({
            success: true,
            count
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/admin/requests/:id/approve
// @desc    Approve an edit request
// @access  Protected (Super Admin)
router.post('/requests/:id/approve', authMiddleware, ensureSuperAdmin, async (req, res, next) => {
    try {
        const request = await PatientEditRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Request is already processed'
            });
        }

        // Apply changes to patient
        const patient = await Patient.findById(request.patient);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        Object.assign(patient, request.requestedChanges);

        // Generate AI Summary on approval
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

        // Update request status
        request.status = 'APPROVED';
        await request.save();

        res.json({
            success: true,
            message: 'Request approved and patient updated',
            patient
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/admin/requests/:id/reject
// @desc    Reject an edit request
// @access  Protected (Super Admin)
router.post('/requests/:id/reject', authMiddleware, ensureSuperAdmin, async (req, res, next) => {
    try {
        const request = await PatientEditRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Request is already processed'
            });
        }

        // Update request status
        request.status = 'REJECTED';
        await request.save();

        res.json({
            success: true,
            message: 'Request rejected'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
