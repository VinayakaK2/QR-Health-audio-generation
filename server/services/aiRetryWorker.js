const Patient = require('../models/Patient');
const { processPatientJob } = require('./aiSummaryService');

let intervalId = null;

function startRetryWorker() {
    if (intervalId) return;

    console.log("🚀 AI Retry Worker Started (Polling every 60s)");

    // Run initial check after short delay to allow server startup
    setTimeout(runChecks, 5000);

    intervalId = setInterval(runChecks, 60000);
}

async function runChecks() {
    try {
        const now = new Date();
        // Find patients needing retry
        // aiGenStatus = FAILED AND aiNextRetryAt <= now
        const candidates = await Patient.find({
            aiGenStatus: 'FAILED',
            aiNextRetryAt: { $lte: now }
        }).limit(5); // Batch size

        if (candidates.length > 0) {
            console.log(`⏰ AI Worker found ${candidates.length} candidates for retry.`);

            for (const p of candidates) {
                console.log(`Re-processing patient ${p.email}...`);
                await processPatientJob(p._id);
            }
        }
    } catch (error) {
        console.error("AI Worker Error:", error.message);
    }
}

module.exports = { startRetryWorker };
