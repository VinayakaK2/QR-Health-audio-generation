const express = require('express');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/hospitals
// @desc    Get all hospitals (SUPER_ADMIN only)
// @access  Protected (SUPER_ADMIN)
router.get('/hospitals', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        const hospitals = await Hospital.find()
            .populate('adminUser', 'name email')
            .sort({ createdAt: -1 });

        // Get patient counts for each hospital
        const hospitalsWithCounts = await Promise.all(
            hospitals.map(async (hospital) => {
                const patientCount = await Patient.countDocuments({ hospital: hospital._id });
                return {
                    ...hospital.toObject(),
                    patientCount
                };
            })
        );

        res.json({
            success: true,
            count: hospitalsWithCounts.length,
            hospitals: hospitalsWithCounts
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/admin/patients
// @desc    Get all patients from all hospitals (SUPER_ADMIN only)
// @access  Protected (SUPER_ADMIN)
router.get('/patients', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        const patients = await Patient.find()
            .populate('hospital', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: patients.length,
            patients
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/admin/hospitals/:id/patients
// @desc    Get all patients from a specific hospital (SUPER_ADMIN only)
// @access  Protected (SUPER_ADMIN)
router.get('/hospitals/:id/patients', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        const hospital = await Hospital.findById(req.params.id);

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: 'Hospital not found'
            });
        }

        const patients = await Patient.find({ hospital: req.params.id })
            .populate('hospital', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            hospital: {
                _id: hospital._id,
                name: hospital.name,
                email: hospital.email
            },
            count: patients.length,
            patients
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/admin/reports
// @desc    Get all reports from all hospitals (SUPER_ADMIN only)
// @access  Protected (SUPER_ADMIN)
router.get('/reports', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        const reports = await Report.find()
            .populate('patient', 'fullName bloodGroup riskLevel')
            .populate('hospital', 'name')
            .populate('createdBy', 'name')
            .sort({ reportDate: -1 });

        res.json({
            success: true,
            count: reports.length,
            reports
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/admin/patients/:patientId/reports
// @desc    Get all reports for a specific patient (SUPER_ADMIN only)
// @access  Protected (SUPER_ADMIN)
router.get('/patients/:patientId/reports', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        const { patientId } = req.params;

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const reports = await Report.find({ patient: patientId })
            .populate('hospital', 'name email')
            .populate('createdBy', 'name')
            .sort({ reportDate: -1 });

        res.json({
            success: true,
            patient: {
                _id: patient._id,
                fullName: patient.fullName,
                bloodGroup: patient.bloodGroup,
                riskLevel: patient.riskLevel
            },
            count: reports.length,
            reports
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
