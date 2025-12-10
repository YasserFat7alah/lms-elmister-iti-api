import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MONGO_URI, GRADE_LEVELS } from '../utils/constants.js';
import Course from '../models/Course.js';
import Group from '../models/Group.js';
import User from '../models/users/User.js';

// Load env vars
dotenv.config();

const seedCourses = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Find a Teacher
        const teacher = await User.findOne({ role: 'teacher' });
        if (!teacher) {
            console.error('Error: No teacher found in the database. Please create a teacher account first.');
            process.exit(1);
        }
        console.log(`Using Teacher: ${teacher.name} (${teacher._id})`);

        // 2. Define Courses Data
        const coursesData = [
            {
                title: "Advanced Algebra & Functions",
                subject: "Math",
                gradeLevel: "10",
                courseLanguage: "english",
                description: "Master the fundamentals of Algebra II, including functions, polynomials, and complex numbers.",
                status: "published",
                tags: ["algebra", "math", "functions"],
                isFree: false
            },
            {
                title: "Introduction to Physics",
                subject: "Physics",
                gradeLevel: "11",
                courseLanguage: "arabic",
                description: "A comprehensive introduction to mechanics, thermodynamics, and waves.",
                status: "published",
                tags: ["physics", "science", "mechanics"],
                isFree: false
            },
            {
                title: "Organic Chemistry Basics",
                subject: "Chemistry",
                gradeLevel: "12",
                courseLanguage: "english",
                description: "Understand the structure, properties, and reactions of organic compounds.",
                status: "published",
                tags: ["chemistry", "organic", "science"],
                isFree: false
            },
            {
                title: "Biology: The Living World",
                subject: "Biology",
                gradeLevel: "9",
                courseLanguage: "arabic",
                description: "Explore the diversity of life, from cells to ecosystems.",
                status: "published",
                tags: ["biology", "life", "cells"],
                isFree: true // This one is free
            },
            {
                title: "World History: 20th Century",
                subject: "History",
                gradeLevel: "8",
                courseLanguage: "english",
                description: "A deep dive into the major events that shaped the modern world.",
                status: "published",
                tags: ["history", "humanities", "world war"],
                isFree: false
            }
        ];

        // 3. Create Courses & Groups
        for (const data of coursesData) {
            // Check if exists
            const existing = await Course.findOne({ title: data.title });
            if (existing) {
                console.log(`Course "${data.title}" already exists. Skipping.`);
                continue;
            }

            const course = await Course.create({
                ...data,
                teacherId: teacher._id,
                subTitle: data.description.substring(0, 50) + "...",
            });

            console.log(`Created Course: ${course.title}`);

            // Create Group(s)
            // If course is free -> Group price 0, isFree: true
            // If paid -> Group price > 0

            const groupData = {
                title: `Group A`,
                type: "online",
                startingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                schedule: [{ day: "mon", time: "18:00" }, { day: "thu", time: "18:00" }],
                capacity: 30,
                courseId: course._id,
                teacherId: teacher._id,
                isFree: data.isFree,
                price: data.isFree ? 0 : (Math.floor(Math.random() * 150) + 50), // Random price 50-200
                currency: "EGP",
                status: "open",
                link: "https://zoom.us/j/123456789" // Required for online groups
            };

            const group = await Group.create(groupData);
            console.log(`  > Created Group: ${group.title} (Price: ${group.price}, Free: ${group.isFree})`);

            // Add group to course
            course.groups.push(group._id);
            await course.save();
        }

        console.log('Seeding Complete!');
        process.exit(0);

    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
};

seedCourses();
