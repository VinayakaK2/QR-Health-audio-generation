const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Patient is required']
    },
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Hospital is required']
    },
    title: {
        type: String,
        required: [true, 'Report title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    reportType: {
        type: String,
        trim: true,
        enum: ['Lab', 'Scan', 'Prescription', 'Consultation', 'Surgery', 'Other'],
        default: 'Other'
    },
    reportDate: {
        type: Date,
        default: Date.now
    },
    reportFileUrl: {
        type: String,
        trim: true,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // AI Analysis Fields
    aiCategory: {
        type: String,
        trim: true
    },
    aiPanels: {
        type: [String],
        default: []
    },
    aiSummary: {
        type: String,
        trim: true
    },
    aiHealthSuggestions: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Index for faster queries
reportSchema.index({ patient: 1, hospital: 1 });
reportSchema.index({ hospital: 1, reportDate: -1 });

module.exports = mongoose.model('Report', reportSchema);
