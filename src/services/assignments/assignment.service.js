import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../helpers/cloudinary.service.js";
import Group from "../../models/Group.js";
import Lesson from "../../models/Lesson.js";
import Enrollment from "../../models/Enrollment.js";
import notificationService from "../notification.service.js";
import { emitNotification } from "../../config/socket/index.js";
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

            // Populate course to get title
            await lessonDoc.populate({ path: 'groupId', populate: { path: 'courseId' } });

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

        // Notify Parents
        const groupId = assignment.group;
        if (groupId) {
            const parentIds = await Enrollment.find({ group: groupId, status: 'active' }).distinct('parent');
            if (parentIds.length > 0) {
                const courseTitle = course?.title || "Class";
                const notifications = await notificationService.notifyManyUsers({
                    userIds: parentIds,
                    title: "New Assignment",
                    message: `New assignment "${title}" posted in ${courseTitle}`,
                    type: "SYSTEM",
                    refId: assignment._id,
                    refCollection: "Assignment"
                });
                parentIds.forEach(id => {
                    const notif = notifications.find(n => n.receiver.toString() === id.toString());
                    if (notif) emitNotification({ userId: id, notification: notif });
                });
            }
        }

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

    async getGroupAssignmentsForStudent(groupId, studentId) {
        const assignments = await this.model
            .find({ group: groupId, status: 'active' })
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return await this.enrichAssignmentsWithStatus(assignments, studentId);
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
        // 1. Get all courses or groups the student is enrolled in
        const Enrollment = mongoose.model("Enrollment"); // assuming you have an Enrollment model
        const enrollments = await Enrollment.find({ student: studentId }).populate("group course");

        const groupIds = enrollments.map(e => e.group?._id).filter(Boolean);
        const courseIds = enrollments.map(e => e.course?._id).filter(Boolean);

        // 2. Find assignments where group or course matches
        const assignments = await this.model
            .find({
                $or: [
                    { group: { $in: groupIds } },
                    { course: { $in: courseIds } }
                ],
                status: "active"
            })
            .populate("group", "title")
            .populate("lesson", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return await this.enrichAssignmentsWithStatus(assignments, studentId);
    }

    async enrichAssignmentsWithStatus(assignments, studentId) {
        const Submission = mongoose.model("Submission");
        const assignmentIds = assignments.map(a => a._id);

        const submissions = await Submission.find({
            assignment: { $in: assignmentIds },
            student: studentId
        });

        const submissionMap = {};
        submissions.forEach(sub => {
            submissionMap[sub.assignment.toString()] = sub;
        });

        return assignments.map(assignment => {
            const submission = submissionMap[assignment._id.toString()];
            const assignmentObj = assignment.toObject();

            // Attach submission directly to the object for frontend to use
            assignmentObj.submission = submission || null;

            return assignmentObj;
        });
    }

    async getAssignmentsForStudentByParent(studentId, parentId) {
        // 1. Verify Parent has access to Student
        const StudentProfile = mongoose.model("StudentProfile");
        const isLinked = await StudentProfile.findOne({ user: studentId, parent: parentId });

        if (!isLinked) {
            throw AppError.forbidden("You do not have access to this student's data");
        }

        // 2. Fetch assignments using the existing method
        return await this.getAssignmentsForStudent(studentId);
        return assignments;
    }


    /**
     * Get all assignments created by a teacher
     * @param {string} teacherId
     * @returns {Assignment[]}
     */
    async getTeacherAssignments(teacherId) {
        return await this.model.find({ teacher: teacherId })
            .populate("group", "title")
            .populate("course", "title")
            .sort({ createdAt: -1 });
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