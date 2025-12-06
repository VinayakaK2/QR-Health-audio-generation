require('dotenv').config();
console.log("Current Directory:", process.cwd());
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log("Key length:", process.env.GEMINI_API_KEY.length);
}
const fs = require('fs');
console.log(".env exists:", fs.existsSync('.env'));
