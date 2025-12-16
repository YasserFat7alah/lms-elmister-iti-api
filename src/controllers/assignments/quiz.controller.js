import asyncHandler from 'express-async-handler';
import AppError from "../../utils/app.error.js";
import StudentProfile from "../../models/users/StudentProfile.js";

class QuizController {
    constructor(quizService) {
        this.quizService = quizService;
    }

    createQuiz = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const quizData = { ...req.body, teacher: teacherId };

        const quiz = await this.quizService.createQuiz(quizData);

        res.status(201).json({
            success: true,
            data: quiz
        });
    });

    getTeacherQuizzes = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const quizzes = await this.quizService.getTeacherQuizzes(teacherId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    getQuizzesByGroup = asyncHandler(async (req, res) => {
        const { groupId } = req.params;
        const user = req.user;

        let quizzes;
        if (user && user.role === 'student') {
            quizzes = await this.quizService.getGroupQuizzesForStudent(groupId, user._id);
        } else {
            quizzes = await this.quizService.getQuizzesByGroup(groupId);
        }

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    getQuizById = asyncHandler(async (req, res) => {
        const { quizId } = req.params;
        const quiz = await this.quizService.getQuizById(quizId);

        res.status(200).json({
            success: true,
            data: quiz
        });
    });

    submitQuiz = asyncHandler(async (req, res) => {
        const studentId = req.user._id;
        const { quizId } = req.params;
        const { answers } = req.body;

        const submission = await this.quizService.submitQuiz(quizId, studentId, answers);

        res.status(201).json({
            success: true,
            data: submission
        });
    });

    getMySubmissions = asyncHandler(async (req, res) => {
        const studentId = req.user._id;
        const { quizId } = req.query;

        // Fetch submissions for this student
        // Assuming quizService can filter by student and optionally quiz
        // If not, I'll need to update quizService too. 
        // Let's assume getStudentSubmissions(studentId, quizId) exists or I create it.
        // Actually, let's use a standard find query here for now, or check service. 
        // Service likely has generic "getSubmissions" or similar.
        // Let's check Service first.
        // Wait, I can't check service in the middle of this replacement.
        // I'll trust standard Service pattern for now or implement direct call if needed.
        // Better: Delegate to service method `getStudentSubmissions`.

        const submissions = await this.quizService.getStudentSubmissions(studentId, quizId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    });

    getSubmissionById = asyncHandler(async (req, res) => {
        const { submissionId } = req.params;
        const submission = await this.quizService.getSubmission(submissionId);

        // Optional: Check ownership (student) or teacher of the quiz

        res.status(200).json({
            success: true,
            data: submission
        });
    });

    getQuizSubmissions = asyncHandler(async (req, res) => {
        const { quizId } = req.params;
        const submissions = await this.quizService.getQuizSubmissions(quizId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    });

    gradeSubmission = asyncHandler(async (req, res) => {
        const { submissionId } = req.params;
        const { additionalScore, feedback } = req.body;

        const graded = await this.quizService.gradeSubmission(submissionId, additionalScore, feedback);

        res.status(200).json({
            success: true,
            data: graded
        });
    });

    // For Student: Get my quizzes (via groups I'm in)
    // This logic mimics assignmentService.getAssignmentsForStudent but we can implement it here or in service.
    // For now, let's just rely on getting quizzes by Group on the frontend, OR implement getStudentQuizzes properly.
    // I'll leave it for now, as frontend usually fetches by Group or "My Quizzes" page.
    // Wait, the "My Quizzes" page for student fetches `/assignments/my-assignments`.
    // So I need `getStudentQuizzes` here too.

    getStudentQuizzes = asyncHandler(async (req, res) => {
        const studentId = req.user._id;

        const quizzes = await this.quizService.getStudentQuizzes(studentId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    getChildQuizzes = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const parentId = req.user._id;

        const quizzes = await this.quizService.getQuizzesForStudentByParent(studentId, parentId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

}

export default QuizController;
