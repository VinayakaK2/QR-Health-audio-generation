const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'admin@hospital.com';
const PASSWORD = 'admin@123';
const PDF_PATH = path.join(__dirname, '../uploads/1764836297470-894619353.pdf');

async function verifyFix() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log("   Login successful. Token received.");

        console.log("2. Uploading PDF...");
        if (!fs.existsSync(PDF_PATH)) {
            throw new Error(`PDF file not found at ${PDF_PATH}`);
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(PDF_PATH));

        const uploadRes = await axios.post(`${API_URL}/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        const fileUrl = uploadRes.data.fileUrl;
        console.log("   Upload successful. File URL:", fileUrl);

        console.log("3. Triggering AI Validation...");
        const startTime = Date.now();

        const validateRes = await axios.post(`${API_URL}/reports/ai-validate`, {
            uploadedFiles: [{
                fileName: 'test_report.pdf',
                mimeType: 'application/pdf',
                fileUrl: fileUrl
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const duration = (Date.now() - startTime) / 1000;
        console.log(`   Validation complete in ${duration} seconds.`);
        console.log("   Result:", JSON.stringify(validateRes.data, null, 2));

        if (validateRes.data.validationResult.reportCategory !== 'Unknown') {
            console.log("SUCCESS: AI Analysis returned a category.");
        } else {
            console.log("WARNING: AI Analysis returned Unknown, but request completed.");
        }

    } catch (error) {
        console.error("Verification Failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

verifyFix();
