import AppError from "../../utils/app.error.js";
import asyncHandler from 'express-async-handler';
import StudentProfile from "../../models/users/StudentProfile.js";

class SubmissionController {
    constructor({ submissionService, assignmentService }) {
        this.submissionService = submissionService;
        this.assignmentService = assignmentService; // for validation
    }

    /**
     * Student submits an assignment
     * @route POST api/v1/submissions
     * @auth student
     * @params assignmentId
     * @body content, file
     * */
    submitAssignment = asyncHandler(async (req, res) => {
        console.log("=== SUBMIT ASSIGNMENT DEBUG ===");
        console.log("User:", req.user?._id);
        console.log("Params:", req.params);
        console.log("Body:", req.body);
        console.log("File:", req.file);

        const studentId = req.user._id;
        const file = req.file ? req.file : null;
        const { content, answers } = req.body;
        const assignmentId = req.params.assignmentId;

        // Validate if assignment exists
        const assignment = await this.assignmentService.getAssignmentById(assignmentId);
        if (!assignment) throw AppError.notFound("Assignment not found");

        //submit assignment
        const submission = await this.submissionService.submit({ assignmentId, studentId, content, answers, file });

        res.status(201).json({
            success: true,
            data: submission
        });

    });

    /**
     * Teacher grades a submission
     *  @route post api/v1/submissions/:submissionId/graded
     *  @params submissionId
     *  @body grade, feedback
     * */
    gradeSubmission = asyncHandler(async (req, res) => {

        if (req.user.role !== "teacher") //2nd check after middleware
            throw AppError.unauthorized("Only teachers can grade");

        const { submissionId } = req.params;
        const { grade, feedback } = req.body;

        //teacher grades a submission
        const graded = await this.submissionService.grade(submissionId, grade, feedback);

        res.status(200).json({
            success: true,
            data: graded
        });

    });

    /**
     * Teacher gets submissions for an assignment
     *  @route get api/v1/submissions/:assignmentId/all
     *  @params assignmentId
     * */
    getSubmissionsForTeacher = asyncHandler(async (req, res) => {
        const { assignmentId } = req.params;

        const submissions = await this.submissionService.getSubmissions(
            { assignment: assignmentId },
            { populate: { path: "student", select: "name email" } }
        );

        res.json({ success: true, data: submissions });
    })


    /**
     * Parent or student gets submissions for an assignment
     *  @route get api/v1/submissions/:assignmentId
     *  @params assignmentId
    */
    getSubmissionsByAssignment = asyncHandler(async (req, res) => {

        const { assignmentId } = req.params;
        const user = req.user

        // If student >> only his own submissions
        let filter = { assignment: assignmentId };
        if (user.role === "student") {
            filter.student = user._id;
        }
        // If parent >> get all of his children's submissions
        if (user.role === "parent") {
            const children = await StudentProfile.find({ parent: user._id }).select("user");
            const childrenIds = children.map(child => child.user);
            filter.student = { $in: childrenIds }
        }

        const submissions = await this.submissionService.getSubmissions(filter, {
            populate: { path: "student", select: "name email" }
        });

        res.status(200).json({
            success: true,
            data: submissions
        });

    });
}

export default SubmissionController;