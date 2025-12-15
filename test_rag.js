import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ragService from './src/services/rag.service.js';

dotenv.config();

async function test() {
    console.log("Connecting to DB...");
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");
    } catch (err) {
        console.error("DB Connection failed:", err);
        // If DB fails, we might still want to test the AI part if the code allows (it does catche the error)
        // But if connect throws, we probably can't proceed with mongoose buffering.
        // Actually, if connect fails, we should return.
        process.exit(1);
    }

    console.log("Testing RagService...");
    try {
        // We expect this to fail and print errors to console (via console.error in ragService)
        // AND return "I am currently offline..."
        const response = await ragService.askHybridAgent("Hello, are you there?");
        console.log("Response:", response);
    } catch (error) {
        console.error("Critical Error in test:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

test();
