require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const publicRoutes = require('./routes/public');
const hospitalRoutes = require('./routes/hospitals');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');

// Initialize express app
const app = express();

// Connect to MongoDB and create default SUPER_ADMIN
const initializeApp = async () => {
    await connectDB();

    // Create default SUPER_ADMIN if not exists
    try {
        const superAdminEmail = 'owner@smartqr.com';
        const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

        if (!existingSuperAdmin) {
            const superAdmin = new User({
                name: 'System Owner',
                email: superAdminEmail,
                password: 'owner123',
                role: 'SUPER_ADMIN',
                hospital: null,
                isActive: true
            });
            await superAdmin.save();
            console.log('✅ SUPER_ADMIN ready: owner@smartqr.com / owner123');
        } else {
            console.log('ℹ️  SUPER_ADMIN already exists');
        }
    } catch (error) {
        console.error('⚠️  Error creating SUPER_ADMIN:', error.message);
    }
};

initializeApp();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (QR codes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', require('./routes/patientAuthRoutes')); // Mount patient auth routes
app.use('/api/patients', patientRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart Emergency QR Health API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
});
