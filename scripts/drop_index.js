
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI is undefined. Check your .env file.");
    process.exit(1);
}

const dropIndex = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        const db = mongoose.connection.db;
        const collectionName = "enrollments";

        console.log(`Checking indexes for collection: ${collectionName}`);
        const indexes = await db.collection(collectionName).indexes();
        console.log("Current Indexes:", indexes.map(i => i.name));

        const indexName = "subscriptionId_1";
        const indexExists = indexes.some(i => i.name === indexName);

        if (indexExists) {
            console.log(`Dropping index: ${indexName}...`);
            await db.collection(collectionName).dropIndex(indexName);
            console.log("Index dropped successfully.");
        } else {
            console.log(`Index ${indexName} not found.`);
        }

        console.log("Done.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

dropIndex();
