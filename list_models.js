import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        console.log("Fetching models from:", URL.replace(API_KEY, "HIDDEN_KEY"));
        const response = await fetch(URL);
        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Body:", text);
            return;
        }
        const data = await response.json();
        console.log("Models:");
        data.models.forEach(m => {
            if (m.name.includes("gemini")) {
                console.log(`- ${m.name} (${m.version})`);
            }
        });
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

listModels();
