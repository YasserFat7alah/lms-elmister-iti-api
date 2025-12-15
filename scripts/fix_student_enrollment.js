import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Enrollment from '../src/models/Enrollment.js';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const studentId = '693a01dd2f6b6ca002da98ce'; // From debug logs
        const oldGroupId = '693a0898256c91cb4011d4cd';
        const newGroupId = '693b5494988507f47b973989';
        const newCourseId = '693b53d5988507f47b97396c';

        console.log(`Fixing enrollment for student ${studentId}...`);

        const enrollment = await Enrollment.findOne({
            student: studentId,
            group: oldGroupId
        });

        if (!enrollment) {
            console.log('Enrollment not found! Maybe already fixed?');
            return;
        }

        console.log(`Found enrollment: ${enrollment._id}. Moving to new Course/Group...`);
        enrollment.group = newGroupId;
        enrollment.course = newCourseId;

        await enrollment.save();
        console.log('Enrollment updated successfully!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();
