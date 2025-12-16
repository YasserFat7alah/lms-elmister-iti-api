import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../helpers/cloudinary.service.js";
import Enrollment from "../../models/Enrollment.js";
import notificationService from "../notification.service.js";
import { emitNotification } from "../../config/socket/index.js";


class SubmissionService extends BaseService {
    constructor(model) {
        super(model);
    }

    async submit({ assignmentId, studentId, content, answers, file }) {
        const existing = await this.model.findOne({ assignment: assignmentId, student: studentId });
        if (existing) throw AppError.badRequest("Already submitted");

        let uploadResult = null;

        if (file) {
            uploadResult = await cloudinaryService.upload(file, `courses/submissions/${assignmentId}`);
        }

        const submitted = await this.model
            .create({
                assignment: assignmentId,
                student: studentId,
                content,
                answers,
                file: uploadResult ? {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    type: "raw"
                } : null
            });

        // Notify Teacher
        // We need to fetch the assignment to get the teacher ID
        const assignmentDoc = await this.model.findById(submitted._id).populate("assignment");
        if (assignmentDoc && assignmentDoc.assignment && assignmentDoc.assignment.teacher) {
            const teacherId = assignmentDoc.assignment.teacher;
            const studentName = await Enrollment.findOne({ student: studentId }).populate("student").then(e => e?.student?.name || "A student"); // fallback name logic might need improvement if Enrollment doesn't populate student name directly, usually User model has name. 
            // Actually better to populate student from submission if possible or just use generic message.
            // Let's rely on what we have.

            const teacherNotification = await notificationService.notifyUser({
                receiver: teacherId,
                title: "New Submission",
                message: `New submission for assignment "${assignmentDoc.assignment.title}"`,
                type: "SYSTEM",
                refId: submitted._id,
                refCollection: "Submission"
            });
            emitNotification({ userId: teacherId, notification: teacherNotification });
        }

        return submitted;
    }

    async grade(submissionId, grade, feedback) {

        const submission = await this.model.findById(submissionId).populate("assignment");
        if (!submission) throw AppError.notFound("Submission not found");

        submission.grade = grade;
        submission.feedback = feedback;
        submission.status = 'graded';
        submission.finalGrade = grade; // Simplification

        await submission.save();

        // Notify Student
        const studentNotification = await notificationService.notifyUser({
            receiver: submission.student,
            title: "Assignment Graded",
            message: `Your assignment "${submission.assignment?.title}" has been graded: ${grade}`,
            type: "SYSTEM", // Or a specific type if available
            refId: submission._id,
            refCollection: "Submission"
        });
        emitNotification({ userId: submission.student, notification: studentNotification });

        // Notify Parent
        // Try to find parent via enrollment in the course/group
        let parentId = null;
        if (submission.assignment?.group) {
            const enrollment = await Enrollment.findOne({ student: submission.student, group: submission.assignment.group, status: 'active' });
            parentId = enrollment?.parent;
        } else if (submission.assignment?.course) {
            const enrollment = await Enrollment.findOne({ student: submission.student, course: submission.assignment.course, status: 'active' });
            parentId = enrollment?.parent;
        }

        if (parentId) {
            const parentNotification = await notificationService.notifyUser({
                receiver: parentId,
                title: "Assignment Graded",
                message: `Your child's assignment "${submission.assignment?.title}" has been graded: ${grade}`,
                type: "SYSTEM",
                refId: submission._id,
                refCollection: "Submission"
            });
            emitNotification({ userId: parentId, notification: parentNotification });
        }

        return submission;
    }

    async getSubmissions(filter = {}, options = {}) {
        const query = this.model.find(filter);

        if (options.populate) {
            query.populate(options.populate);
        }

        if (options.sort) {
            query.sort(options.sort);
        }

        const submissions = await query;

        if (!submissions.length) {
            throw AppError.notFound("No submissions found");
        }

        return submissions;
    }

}

export default SubmissionService;