import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../helpers/cloudinary.service.js";
import Group from "../../models/Group.js";
import Lesson from "../../models/Lesson.js";
import Enrollment from "../../models/Enrollment.js";
import Submission from "../../models/assignments/Submission.js";
import mongoose from "mongoose";


class AssignmentService extends BaseService {
    constructor(model) {
        super(model);
    }
    async createAssignment({
        title, description, group, lesson, teacher, totalGrade = 100, dueDate,
        allowLateSubmission, maxLateDays, latePenaltyPerDay, file
    }) {
        console.log("=== CREATE ASSIGNMENT DEBUG ===");
        console.log("Received lesson:", lesson);
        console.log("Received group:", group);
        console.log("Received teacher:", teacher);

        // Only one of group or lesson can be provided
        if (group && lesson) {
            throw AppError.badRequest("Please provide either group OR lesson, not both");
        }

        let course;

        // Group logic
        if (group) {
            console.log("Processing as GROUP assignment");
            const groupDoc = await Group.findById(group);
            console.log("Found group:", groupDoc);
            if (!groupDoc) throw AppError.notFound("Group not found");

            if (groupDoc.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create assignments for this group");
            }
            course = groupDoc.courseId;
            console.log("Course from group:", course);
        }

        // Lesson logic
        if (lesson) {
            console.log("Processing as LESSON assignment");
            const lessonDoc = await Lesson.findById(lesson).populate("groupId");
            console.log("Found lesson:", lessonDoc);

            if (!lessonDoc) throw AppError.notFound("Lesson not found");

            if (!lessonDoc.groupId) {
                throw AppError.badRequest("Lesson is not linked to any group");
            }
            console.log("Lesson's groupId:", lessonDoc.groupId);

            if (lessonDoc.groupId.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create assignments for this lesson");
            }

            course = lessonDoc.groupId.courseId; // ← Check if this is the right property
            group = lessonDoc.groupId._id;
            console.log("Course from lesson:", course);
            console.log("Group from lesson:", group);
        }

        console.log("Final course value:", course);
        console.log("==============================");

        if (!course) {
            throw AppError.badRequest("Assignment must belong to a group or a lesson");
        }

        let uploadResult = null;
        if (file) {
            uploadResult = await cloudinaryService.upload(file, `courses/${group || lesson || course}/assignments`);
        }
        const assignment = await this.model.create({
            title, description, group, lesson, course, teacher, totalGrade, dueDate,
            file: uploadResult ? {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: "raw"
            } : null
        });

        return assignment;
    }

    async getAssignmentsByGroup(groupId) {

        const assignments = await this.model
            .find({ group: groupId })
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 })

        return assignments;
    }

    async getAssignmentsByLesson(lessonId) {

        const assignments = await this.model
            .find({ lesson: lessonId })
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return assignments;
    }

    async getAssignmentById(id) {

        const assignment = await this.model.findById(id)
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")

        if (!assignment) throw AppError.notFound("Assignment not found");

        return assignment;
    }

    async getAssignmentsForStudent(studentId) {
        // Simple file logger for debugging since we can't see terminal
        const fs = await import('fs');
        const logFile = 'debug_assignment.log';
        const log = (msg, data = '') => {
            try {
                const timestamp = new Date().toISOString();
                const logMsg = `[${timestamp}] ${msg} ${typeof data === 'object' ? JSON.stringify(data) : data}\n`;
                fs.appendFileSync(logFile, logMsg);
            } catch (e) { /* ignore */ }
        };

        log("=== GET STUDENT ASSIGNMENTS REQUEST ===");
        log("Student ID:", studentId);

        try {
            // 1. Get all courses or groups the student is enrolled in
            const enrollments = await Enrollment.find({ student: studentId })
                .select("group course")
                .lean();

            log(`Found ${enrollments.length} enrollments`, enrollments);

            const groupIds = enrollments.map(e => e.group?._id || e.group).filter(Boolean);
            const courseIds = enrollments.map(e => e.course?._id || e.course).filter(Boolean);

            log("Group IDs:", groupIds);
            log("Course IDs:", courseIds);

            if (groupIds.length === 0 && courseIds.length === 0) {
                log("No enrollments found, returning empty array.");
                return [];
            }

            // 2. Find assignments where group or course matches
            // Relaxed filter: removed status: "active" to ensure we see all assignments
            const query = {
                $or: [
                    { group: { $in: groupIds } },
                    { course: { $in: courseIds } }
                ]
                // status: "active" // Removed strict filter
            };

            log("Assignment Query:", query);

            const assignments = await this.model
                .find(query)
                .select("title dueDate totalGrade status allowLateSubmission maxLateDays latePenaltyPerDay group lesson course teacher")
                .populate("group", "title")
                .populate("lesson", "title")
                .populate("course", "title")
                .populate("teacher", "name email")
                .sort({ dueDate: 1 })
                .lean();

            log(`Found ${assignments.length} assignments query results`);

            // 3. Fetch Submissions for these assignments
            const Submission = mongoose.model("Submission"); // Ensure model is loaded or imported if needed
            const assignmentIds = assignments.map(a => a._id);

            const submissions = await Submission.find({
                assignment: { $in: assignmentIds },
                student: studentId
            }).lean();

            log(`Found ${submissions.length} submissions`);

            // 4. Merge submissions into assignments
            const mergedAssignments = assignments.map(assignment => {
                const sub = submissions.find(s => s.assignment.toString() === assignment._id.toString());
                return {
                    ...assignment,
                    submission: sub || null
                };
            });

            log("Returning merged assignments count:", mergedAssignments.length);
            return mergedAssignments;

        } catch (error) {
            log("ERROR in getAssignmentsForStudent:", error.message);
            throw error;
        }
    }


    async updateAssignment(assignmentId, teacherId, updateData, file) {
        console.log("=== UPDATE ASSIGNMENT DEBUG ===");
        console.log("Assignment ID:", assignmentId);
        console.log("Teacher ID:", teacherId);
        console.log("Update data:", updateData);

        // Find the assignment
        const assignment = await this.model.findById(assignmentId);
        if (!assignment) {
            throw AppError.notFound("Assignment not found");
        }

        // Check if teacher owns this assignment
        if (assignment.teacher.toString() !== teacherId.toString()) {
            throw AppError.forbidden("You are not allowed to update this assignment");
        }

        // Handle file upload if new file provided
        if (file) {
            // Delete old file from cloudinary if exists
            if (assignment.file?.publicId) {
                await cloudinaryService.destroy(assignment.file.publicId);
            }

            // Upload new file
            const uploadResult = await cloudinaryService.upload(
                file,
                `courses/${assignment.group || assignment.lesson || assignment.course}/assignments`
            );

            updateData.file = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: "raw"
            };
        }

        // Update the assignment
        const updatedAssignment = await this.model.findByIdAndUpdate(
            assignmentId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email");

        console.log("Updated assignment:", updatedAssignment);
        console.log("==============================");

        return updatedAssignment;
    }

    async deleteAssignment(assignmentId, teacherId) {
        console.log("=== DELETE ASSIGNMENT DEBUG ===");
        console.log("Assignment ID:", assignmentId);
        console.log("Teacher ID:", teacherId);

        // Find the assignment
        const assignment = await this.model.findById(assignmentId);
        if (!assignment) {
            throw AppError.notFound("Assignment not found");
        }

        // Check if teacher owns this assignment
        if (assignment.teacher.toString() !== teacherId.toString()) {
            throw AppError.forbidden("You are not allowed to delete this assignment");
        }

        // Delete file from cloudinary if exists
        if (assignment.file?.publicId) {
            try {
                await cloudinaryService.destroy(assignment.file.publicId);
                console.log("Deleted file from cloudinary:", assignment.file.publicId);
            } catch (error) {
                console.error("Error deleting file from cloudinary:", error);
                // Continue with deletion even if cloudinary fails
            }
        }

        // Delete the assignment
        await this.model.findByIdAndDelete(assignmentId);

        console.log("Assignment deleted successfully");
        console.log("==============================");

        return { message: "Assignment deleted successfully" };
    }
}

export default AssignmentService;