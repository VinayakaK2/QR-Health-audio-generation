const express = require('express');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const { authMiddleware, requireHospitalAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and HOSPITAL_ADMIN role
router.use(authMiddleware, requireHospitalAdmin);

// @route   POST /api/reports
// @desc    Create a new report for a patient
// @access  Protected (HOSPITAL_ADMIN)
router.post('/', async (req, res, next) => {
    try {
        const { patientId, title, description, reportType, reportDate, reportFileUrl } = req.body;

        if (!patientId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and title are required'
            });
        }

        // Verify patient exists and belongs to hospital admin's hospital
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        if (patient.hospital.toString() !== req.userHospital.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only create reports for patients in your hospital'
            });
        }

        // Create report
        const report = new Report({
            patient: patientId,
            hospital: req.userHospital,
            title,
            description: description || '',
            reportType: reportType || 'Other',
            reportDate: reportDate || Date.now(),
            reportFileUrl: reportFileUrl || '',
            createdBy: req.userId
        });

        await report.save();

        // Populate for response
        await report.populate('patient', 'fullName bloodGroup');
        await report.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            report
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/reports/patient/:patientId
// @desc    Get all reports for a specific patient
// @access  Protected (HOSPITAL_ADMIN)
router.get('/patient/:patientId', async (req, res, next) => {
    try {
        const { patientId } = req.params;

        // Verify patient exists and belongs to hospital admin's hospital
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        if (patient.hospital.toString() !== req.userHospital.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const reports = await Report.find({ patient: patientId })
            .populate('createdBy', 'name email')
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

// @route   GET /api/reports/:id
// @desc    Get a single report by ID
// @access  Protected (HOSPITAL_ADMIN)
router.get('/:id', async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.id)
            .populate('patient', 'fullName bloodGroup age gender')
            .populate('createdBy', 'name email');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Verify hospital ownership
        if (report.hospital.toString() !== req.userHospital.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/reports/:id
// @desc    Update a report
// @access  Protected (HOSPITAL_ADMIN)
router.put('/:id', async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Verify hospital ownership
        if (report.hospital.toString() !== req.userHospital.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update allowed fields
        const { title, description, reportType, reportDate, reportFileUrl } = req.body;

        if (title) report.title = title;
        if (description !== undefined) report.description = description;
        if (reportType) report.reportType = reportType;
        if (reportDate) report.reportDate = reportDate;
        if (reportFileUrl !== undefined) report.reportFileUrl = reportFileUrl;

        await report.save();
        await report.populate('patient', 'fullName bloodGroup');
        await report.populate('createdBy', 'name email');

        res.json({
            success: true,
            message: 'Report updated successfully',
            report
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a report
// @access  Protected (HOSPITAL_ADMIN)
router.delete('/:id', async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Verify hospital ownership
        if (report.hospital.toString() !== req.userHospital.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await Report.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
