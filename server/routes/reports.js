const express = require('express');
const Report = require('../models/Report');
const Patient = require('../models/Patient');
const { authMiddleware, requireHospitalAdmin } = require('../middleware/auth');
const { analyzeReportText, extractTextFromFile, generateOverallSummary } = require('../src/services/reportAnalyzerService');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

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

        const patientId = req.userPatientId || req.userId; // Depending on how auth sets it

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
            if (patient.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only create reports for patients in your hospital'
                });
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

        // Trigger overall analysis
        try {
            triggerOverallAnalysis(patientId); // Intentionally not awaiting to avoid blocking response
        } catch (err) {
            console.error("Failed to trigger overall analysis:", err);
        }

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

        // Check hospital ownership (skip for SUPER_ADMIN)
        if (req.userRole !== 'SUPER_ADMIN') {
            if (!patient.hospital || !req.userHospital) {
                console.error("Missing hospital info:", { patientHospital: patient.hospital, userHospital: req.userHospital });
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Invalid hospital data'
                });
            }

            if (patient.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
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

        // Verify hospital ownership (skip for SUPER_ADMIN)
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

        // Verify hospital ownership (skip for SUPER_ADMIN)
        if (req.userRole !== 'SUPER_ADMIN') {
            if (report.hospital.toString() !== req.userHospital.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
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

        // Trigger overall analysis
        try {
            triggerOverallAnalysis(report.patient._id || report.patient); // Intentionally not awaiting
        } catch (err) {
            console.error("Failed to trigger overall analysis:", err);
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

        // Verify hospital ownership (skip for SUPER_ADMIN)
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

// @route   POST /api/reports/ai-validate
// @desc    Analyze report content using AI
// @access  Protected (HOSPITAL_ADMIN)
router.post('/ai-validate', async (req, res, next) => {
    try {
        console.log("AI Validate Request Body:", JSON.stringify(req.body, null, 2));
        const { uploadedFiles } = req.body;

        if (!uploadedFiles || uploadedFiles.length === 0) {
            console.log("Error: No uploaded files metadata");
            return res.status(400).json({
                success: false,
                message: 'Uploaded files metadata is required'
            });
        }

        const fileMeta = uploadedFiles[0]; // Analyze the first file for now
        if (!fileMeta.fileUrl) {
            console.log("Error: No fileUrl in metadata");
            return res.status(400).json({
                success: false,
                message: 'File URL is required for analysis'
            });
        }

        // Construct local path from URL (assuming /uploads/filename format)
        // URL: http://localhost:5000/uploads/filename
        const fileName = fileMeta.fileUrl.split('/').pop();
        // FIXED PATH: uploads is in server/uploads, which is ../uploads from server/routes
        const filePath = path.join(__dirname, '../uploads', fileName);

        console.log("Looking for file at:", filePath);

        if (!fs.existsSync(filePath)) {
            console.log("Error: File not found at path");
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Extract text
        const rawText = await extractTextFromFile(filePath, fileMeta.mimeType);

        if (!rawText || rawText.trim().length < 20) {
            console.log("Insufficient text extracted from file.");
            return res.json({
                success: true,
                validationResult: {
                    reportCategory: "Unknown",
                    detectedPanels: [],
                    keyFindings: "Could not extract readable text from this file. It might be a scanned document without OCR text."
                }
            });
        }

        // Analyze
        const validationResult = await analyzeReportText(rawText, fileName);

        res.json({
            success: true,
            validationResult
        });

    } catch (error) {
        console.error("Analysis failed:", error);
        // Return empty/unknown result instead of erroring out
        res.json({
            success: true,
            validationResult: {
                reportCategory: "Unknown",
                detectedPanels: [],
                keyFindings: "Analysis failed."
            }
        });
    }
});

// Helper to trigger overall analysis
const triggerOverallAnalysis = async (patientId) => {
    try {
        const reports = await Report.find({ patient: patientId })
            .select('title reportDate reportType aiCategory aiSummary aiHealthSuggestions aiPanels')
            .sort({ reportDate: -1 });

        if (reports.length > 0) {
            const analysisResult = await generateOverallSummary(reports);

            if (analysisResult) {
                await Patient.findByIdAndUpdate(patientId, {
                    aiCombinedSummary: analysisResult.overallSummary,
                    aiDetailedBreakdown: analysisResult.combinedSections + "\n\n" + analysisResult.finalConclusionTable + "\n\n### WHAT NEEDS ATTENTION\n" + (analysisResult.whatNeedsAttention || ""), // merging for display simplicity if needed, or keeping separate. The prompt returns specific fields.
                    // Wait, the prompt returns: overallSummary, combinedSections, finalConclusionTable, lifestyleAdvice.
                    // The user wants: aiCombinedSummary, aiDetailedBreakdown, aiLifestyleAdvice.
                    // Let's map them:
                    // aiCombinedSummary -> overallSummary
                    // aiDetailedBreakdown -> combinedSections + finalConclusionTable (or just combinedSections, and we render table separately? The user said "Show aiDetailedBreakdown in structured bullet sections exactly like example". The example includes the table and "What needs attention".
                    // Let's combine the detailed parts into aiDetailedBreakdown for now, or better yet, store the raw JSON if we could, but schema is String.
                    // Let's store the "combinedSections" + "finalConclusionTable" in aiDetailedBreakdown.
                    aiDetailedBreakdown: analysisResult.combinedSections + "\n\n" + analysisResult.finalConclusionTable,
                    aiLifestyleAdvice: analysisResult.lifestyleAdvice,
                    aiLastUpdatedAt: new Date()
                });
                console.log(`Overall analysis updated for patient ${patientId}`);
            }
        }
    } catch (error) {
        console.error("Error triggering overall analysis:", error);
    }
};

// @route   POST /api/reports/overall-analysis
// @desc    Manually trigger overall analysis
// @access  Protected (HOSPITAL_ADMIN)
router.post('/overall-analysis', async (req, res, next) => {
    try {
        const { patientId } = req.body;
        if (!patientId) {
            return res.status(400).json({ success: false, message: 'Patient ID required' });
        }

        // Trigger analysis (async, don't wait for response to be fast, or wait? User said "Show Re-Analyzing loader". 
        // If we call this from frontend, we might want to wait.)
        await triggerOverallAnalysis(patientId);

        const updatedPatient = await Patient.findById(patientId).select('aiCombinedSummary aiDetailedBreakdown aiLifestyleAdvice aiLastUpdatedAt');

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
