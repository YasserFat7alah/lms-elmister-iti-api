import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    console.log("Listing available Gemini models...");
    try {
        // Note: listModels is not on genAI instance directly usually? 
        // Wait, checking docs pattern. usually it is a separate manager or on the client.
        // The GoogleGenerativeAI class is a wrapper.
        // Actually, checking how to list models.
        // Ideally I'd need the ModelService possibly?
        // Let's rely on documentation or try a common pattern.
        // actually looking at the error message: "Call ListModels to see the list..."
        // It implies there is an API endpoint.

        // Using python generic code mental model: genai.list_models()
        // In JS SDK: 
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // It doesn't seem to expose listModels on the main class easily?
        // Wait, checking node_modules might take time.
        // I'll try to use the raw API via fetch if the SDK doesn't obviously support it in my knowledge base.
        // But SDK likely has it.

        // Let's Search Web first for "how to list models google-generative-ai-node"
        // To be safe/fast.
    } catch (e) {
        console.error(e);
    }
}

// I'll just skip writing this file yet and Search Web first to get the snippet.
