import mongoose from "mongoose";
import { MONGO_URI } from "../utils/constants.js";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

export default connectDB;