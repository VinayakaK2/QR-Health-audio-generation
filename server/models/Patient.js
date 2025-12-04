const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const patientSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        // Password is optional for existing patients, but required for portal access
        select: false // Don't return password by default
    },
    faceDescriptor: {
        type: [Number],
        select: false // Don't return by default, only when needed for verification
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [0, 'Age must be positive'],
        max: [150, 'Invalid age']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other']
    },
    photoUrl: {
        type: String,
        trim: true,
        default: ''
    },
    bloodGroup: {
        type: String,
        required: [true, 'Blood group is required'],
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    allergies: {
        type: [String],
        default: []
    },
    medicalConditions: {
        type: [String],
        default: []
    },
    medications: {
        type: [String],
        default: []
    },
    emergencyContact: {
        name: {
            type: String,
            required: [true, 'Emergency contact name is required'],
            trim: true
        },
        phone: {
            type: String,
            required: [true, 'Emergency contact phone is required'],
            trim: true,
            match: [/^[+]?[\d\s-()]+$/, 'Please provide a valid phone number']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
        }
    },
    riskLevel: {
        type: String,
        required: [true, 'Risk level is required'],
        enum: ['High', 'Medium', 'Low'],
        default: 'Low'
    },
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Hospital is required']
    },
    qrToken: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },
    qrCodeUrl: {
        type: String,
        default: ''
    },
    aiSummary: {
        type: String
    },
    aiLastUpdatedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
patientSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    // Only hash if password exists (it might be undefined for updates that don't touch it)
    if (this.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Method to compare passwords
patientSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Index for faster qrToken lookups
patientSchema.index({ qrToken: 1 });

module.exports = mongoose.model('Patient', patientSchema);
