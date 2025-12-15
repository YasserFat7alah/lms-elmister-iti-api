import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path if .env is in root, which is one level up from src (where I assume this script will be run or relative to properly)
// In constants.js they just do dotenv.config() which usually looks in cwd. 
// I will try to match constants.js behavior.
dotenv.config();

console.log("Checking Environment Variables...");
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);
console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
