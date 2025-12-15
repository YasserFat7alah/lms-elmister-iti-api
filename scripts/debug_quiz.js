import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Import Models
// Note: We need to register models if they have refs
// Just importing them should register them if they export the model
import Enrollment from '../src/models/Enrollment.js';
import Quiz from '../src/models/quizzes/Quiz.js';
import User from '../src/models/users/User.js';
import Group from '../src/models/Group.js';
import Course from '../src/models/Course.js'; // Group refs Course usually

const run = async () => {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI not found in .env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find a student
        // Try to find one with enrollments if possible
        const enrollments = await Enrollment.findOne();
        let studentId = enrollments?.student;

        let student;
        if (studentId) {
            student = await User.findById(studentId);
        } else {
            student = await User.findOne({ role: 'student' });
        }

        if (!student) {
            console.log('No student found in DB');
            return;
        }
        console.log(`Checking for student: ${student.email} (${student._id})`);

        // Check Enrollments
        const allEnrollments = await Enrollment.find({ student: student._id }).populate('group');
        console.log(`Found ${allEnrollments.length} enrollments`);

        const groupIds = [];
        allEnrollments.forEach((e, i) => {
            const group = e.group;
            if (group) {
                console.log(`Enrollment ${i}: GroupID=${group._id}, Title=${group.title}, Status=${e.status}`);
                groupIds.push(group._id);
            } else {
                console.log(`Enrollment ${i}: Group is NULL (Raw Group ID: ${e.group})`);
            }
        });

        console.log(`Extracted Group IDs: ${groupIds.map(id => id.toString())}`);

        if (groupIds.length > 0) {
            // Check Quizzes
            console.log('--- Checking Quizzes for Student Groups ---');
            const quizzes = await Quiz.find({
                group: { $in: groupIds }
            });
            console.log(`Found ${quizzes.length} TOTAL quizzes for student groups`);
        }

        console.log('--- SYSTEM WIDE CHECK ---');
        const allQuizzes = await Quiz.find({});
        console.log(`Total Quizzes in DB: ${allQuizzes.length}`);
        if (allQuizzes.length > 0) {
            allQuizzes.forEach(q => {
                console.log(`Quiz ID: ${q._id}, Title: ${q.title}, GroupID: ${q.group}`);
            });
        }

        const allGroups = await Group.find({});
        console.log(`Total Groups in DB: ${allGroups.length}`);
        allGroups.forEach(g => {
            console.log(`Group ID: ${g._id}, Title: ${g.title}, CourseID: ${g.courseId}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();
