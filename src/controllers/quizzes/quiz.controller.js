import asyncHandler from 'express-async-handler';
import AppError from '../../utils/app.error.js';
import ParentProfile from '../../models/users/ParentProfile.js';
import QuizSubmission from '../../models/quizzes/QuizSubmission.js';

class QuizController {
    constructor(quizService) {
        this.quizService = quizService;
    }

    /**
     * Create a new quiz
     * @route POST /api/v1/quizzes
     * @auth teacher
     */
    createQuiz = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const { title, description, group, questions, dueDate, duration, status } = req.body;

        const quiz = await this.quizService.createQuiz({
            title,
            description,
            group,
            teacher: teacherId,
            questions,
            dueDate,
            duration,
            status
        });

        res.status(201).json({
            success: true,
            data: quiz
        });
    });

    /**
     * Get all quizzes for a specific group
     * @route GET /api/v1/quizzes/group/:groupId
     */
    getQuizzesByGroup = asyncHandler(async (req, res) => {
        const { groupId } = req.params;

        const quizzes = await this.quizService.getQuizzesByGroup(groupId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    /**
     * Get quiz by ID
     * @route GET /api/v1/quizzes/:quizId
     */
    getQuizById = asyncHandler(async (req, res) => {
        const { quizId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const quiz = await this.quizService.getQuizById(quizId, userId, userRole);

        res.status(200).json({
            success: true,
            data: quiz
        });
    });

    /**
     * Get all quizzes for logged-in student
     * @route GET /api/v1/quizzes/my-quizzes
     * @auth student
     */
    getStudentQuizzes = asyncHandler(async (req, res) => {
        const studentId = req.user._id;

        const quizzes = await this.quizService.getQuizzesForStudent(studentId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    /**
     * Submit quiz answers
     * @route POST /api/v1/quizzes/:quizId/submit
     * @auth student
     */
    submitQuiz = asyncHandler(async (req, res) => {
        const { quizId } = req.params;
        const studentId = req.user._id;
        const { answers } = req.body;

        const submission = await this.quizService.submitQuiz(quizId, studentId, answers);

        res.status(201).json({
            success: true,
            message: 'Quiz submitted successfully',
            data: submission
        });
    });

    /**
     * Get all submissions for a quiz
     * @route GET /api/v1/quizzes/:quizId/submissions
     * @auth teacher
     */
    getQuizSubmissions = asyncHandler(async (req, res) => {
        const { quizId } = req.params;
        const teacherId = req.user._id;

        const submissions = await this.quizService.getQuizSubmissions(quizId, teacherId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    });

    /**
     * Get student's own quiz submissions
     * @route GET /api/v1/quizzes/my-submissions
     * @auth student
     */
    getMyQuizSubmissions = asyncHandler(async (req, res) => {
        const studentId = req.user._id;
        const { quizId } = req.query;

        const submissions = await this.quizService.getStudentQuizSubmissions(studentId, quizId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    });

    /**
     * Get child's quiz submissions
     * @route GET /api/v1/quizzes/student/:studentId/submissions
     * @auth parent
     */
    getChildSubmissions = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const parentId = req.user._id;

        // Verify parent-child relationship
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile || !parentProfile.children.map(id => id.toString()).includes(studentId)) {
            throw AppError.forbidden("You do not have permission to view this student's submissions");
        }

        const submissions = await this.quizService.getStudentQuizSubmissions(studentId, null);

        res.status(200).json({
            success: true,
            data: submissions
        });
    });

    /**
     * Get child's quizzes (all statuses)
     * @route GET /api/v1/quizzes/student/:studentId/quizzes
     * @auth parent
     */
    getChildQuizzes = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const parentId = req.user._id;

        // Verify parent-child relationship
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile || !parentProfile.children.map(id => id.toString()).includes(studentId)) {
            throw AppError.forbidden("You do not have permission to view this student's quizzes");
        }

        const quizzes = await this.quizService.getQuizzesForStudent(studentId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });

    /**
     * Get a specific submission with details
     * @route GET /api/v1/quizzes/submissions/:submissionId
     * @auth student/teacher/parent
     */
    getSubmissionById = asyncHandler(async (req, res) => {
        const { submissionId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const submission = await QuizSubmission.findById(submissionId)
            .populate('quiz')
            .populate('student');

        if (!submission) {
            throw AppError.notFound('Submission not found');
        }

        // Access control
        let authorized = false;

        if (userRole === 'teacher') {
            // Check if teacher owns the quiz
            // Need to populate quiz teacher or fetch quiz
            // submission.quiz is populated
            if (submission.quiz.teacher.toString() === userId.toString()) {
                authorized = true;
            }
        } else if (userRole === 'student') {
            if (submission.student._id.toString() === userId.toString()) {
                authorized = true;
            }
        } else if (userRole === 'parent') {
            const parentProfile = await ParentProfile.findOne({ user: userId });
            if (parentProfile && parentProfile.children.map(id => id.toString()).includes(submission.student._id.toString())) {
                authorized = true;
            }
        }

        if (!authorized) {
            throw AppError.forbidden('You are not authorized to view this submission');
        }

        res.status(200).json({
            success: true,
            data: submission
        });
    });

    /**
     * Grade a submission manually
     * @route PATCH /api/v1/quizzes/submissions/:submissionId/grade
     * @auth teacher
     */
    gradeSubmission = asyncHandler(async (req, res) => {
        const { submissionId } = req.params;
        const teacherId = req.user._id;
        const { additionalScore, feedback } = req.body;

        const submission = await this.quizService.gradeSubmission(
            submissionId,
            teacherId,
            additionalScore,
            feedback
        );

        res.status(200).json({
            success: true,
            message: 'Submission graded successfully',
            data: submission
        });
    });

    /**
     * Get all quizzes created by logged-in teacher
     * @route GET /api/v1/quizzes/my-quizzes
     * @auth teacher
     */
    getTeacherQuizzes = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;

        const quizzes = await this.quizService.getTeacherQuizzes(teacherId);

        res.status(200).json({
            success: true,
            data: quizzes
        });
    });
}

export default QuizController;
