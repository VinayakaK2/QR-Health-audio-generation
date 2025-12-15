const express = require('express');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const { authMiddleware, requireHospitalAdmin } = require('../middleware/auth');
const { analyzeReportWithOpenAI } = require('../src/services/reportAnalyzerService');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to trigger patient analysis (analyzes the LATEST or SPECIFIC report)
const triggerPatientAnalysis = async (patientId, reportId = null) => {
    try {
        let report;
        if (reportId) {
            report = await Report.findById(reportId);
        } else {
            // Find latest report
            report = await Report.findOne({ patient: patientId }).sort({ reportDate: -1 });
        }

        if (!report || !report.reportFileUrl) {
            console.log("No report or file found for analysis.");
            return null;
        }

        // Construct file path
        const fileName = report.reportFileUrl.split('/').pop();
        const filePath = path.join(__dirname, '../uploads', fileName);

        if (!fs.existsSync(filePath)) {
            console.log("File not found for analysis:", filePath);
            return null;
        }

        // Determine mime type
        const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

        console.log(`Starting analysis for report: ${fileName}`);

        // Run OpenAI Analysis (handles PDF/image directly)
        console.log("DEBUG: Analyzing with OpenAI File API...");
        const aiData = await analyzeReportWithOpenAI(filePath, mimeType);

        if (aiData) {
            console.log("Saving AI analysis...");

            // A. Update REPORT document
            report.aiRaw = aiData;
            report.aiCategory = aiData.reportType;
            report.aiSummary = aiData.summary;
            report.riskLevel = aiData.riskLevel;
            report.parameters = aiData.parameters;
            report.aiHealthSuggestions = aiData.lifestyleAdvice;
            report.status = "ANALYZED";
            report.aiUpdatedAt = new Date();
            await report.save();

            // B. Update PATIENT document
            console.log("Saving AI summary for patient:", patientId);

            const aiKeyIssues = aiData.parameters
                ? aiData.parameters.filter(p => p.status !== "NORMAL").map(p => `${p.name} is ${p.status}`)
                : [];

            const updatedPatient = await Patient.findByIdAndUpdate(
                patientId,
                {
                    $set: {
                        hasAIAnalysis: true,
                        aiSummary: aiData.summary,
                        aiRiskLevel: aiData.riskLevel,
                        aiKeyIssues: aiKeyIssues,
                        aiLifestyleAdvice: aiData.lifestyleAdvice,
                        aiUpdatedAt: new Date(),
                        aiLastUpdatedAt: new Date(),
                        // Legacy support if needed
                        aiAnalysis: aiData
                    }
                },
                { new: true }
            );

            console.log("AI UPDATED PATIENT >>>", updatedPatient);
            return updatedPatient;
        } else {
            console.log("DEBUG: Skipping DB update because aiData is null.");
            return null;
        }

    } catch (error) {
        console.error("Error triggering patient analysis:", error);
        return null;
    }
};

// @route   GET /api/reports/patient
// @desc    Get all reports for the logged-in patient
// @access  Protected (PATIENT)
router.get('/patient', async (req, res, next) => {
    try {
        // Ensure user is a patient
        if (req.userRole !== 'PATIENT') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Patient role required.'
            });
        }

        const patientId = req.userPatientId || req.userId;

        const reports = await Report.find({ patient: patientId })
            .select('title reportDate reportType aiCategory aiSummary aiHealthSuggestions aiPanels')
            .sort({ reportDate: -1 });

        res.json({
            success: true,
            count: reports.length,
            reports
        });
    } catch (error) {
        console.error("Error fetching patient reports:", error);
        next(error);
    }
});

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

        // Check hospital ownership (skip for SUPER_ADMIN)
        if (req.userRole !== 'SUPER_ADMIN') {
            // Allow if patient is creating their own report
            const isOwnReport = req.userRole === 'PATIENT' && req.userId === patientId;

            if (!isOwnReport) {
                if (!req.userHospital || patient.hospital.toString() !== req.userHospital.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }
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

        // Trigger analysis (ASYNC - don't wait, run in background)
        // This makes upload fast, AI analysis happens separately
        triggerPatientAnalysis(patientId, report._id).catch(err => {
            console.error("Background AI analysis failed:", err);
        });

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

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        if (req.userRole !== 'SUPER_ADMIN') {
            // Allow if patient is viewing their own reports
            const isOwnReports = req.userRole === 'PATIENT' && req.userId === patientId;

            if (!isOwnReports) {
                if (!patient.hospital || !req.userHospital || patient.hospital.toString() !== req.userHospital.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied'
                    });
                }
            }
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
        console.error("Error fetching patient reports:", error);
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

        if (req.userRole !== 'SUPER_ADMIN') {
            if (report.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
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

        if (req.userRole !== 'SUPER_ADMIN') {
            if (report.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        const { title, description, reportType, reportDate, reportFileUrl } = req.body;

        if (title) report.title = title;
        if (description !== undefined) report.description = description;
        if (reportType) report.reportType = reportType;
        if (reportDate) report.reportDate = reportDate;
        if (reportFileUrl !== undefined) report.reportFileUrl = reportFileUrl;

        await report.save();
        await report.populate('patient', 'fullName bloodGroup');
        await report.populate('createdBy', 'name email');

        // Trigger analysis
        try {
            triggerPatientAnalysis(report.patient._id || report.patient, report._id); // Async
        } catch (err) {
            console.error("Failed to trigger analysis:", err);
        }

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

        if (req.userRole !== 'SUPER_ADMIN') {
            if (report.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
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

// @route   POST /api/reports/overall-analysis
// @desc    Manually trigger latest report analysis
// @access  Protected (HOSPITAL_ADMIN)
router.post('/overall-analysis', async (req, res, next) => {
    try {
        const { patientId } = req.body;
        if (!patientId) {
            return res.status(400).json({ success: false, message: 'Patient ID required' });
        }

        await triggerPatientAnalysis(patientId);

        const updatedPatient = await Patient.findById(patientId).select('aiAnalysis aiLastUpdatedAt');

        res.json({
            success: true,
            message: 'Analysis complete',
            data: updatedPatient
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
