import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import Group from "../../models/Group.js";
import QuizSubmission from "../../models/quizzes/QuizSubmission.js";
import mongoose from "mongoose";

class QuizService extends BaseService {
    constructor(model) {
        super(model);
    }

    /**
     * Create a new quiz
     */
    async createQuiz({ title, description, group, teacher, questions, dueDate, duration, status }) {
        // Verify group exists and teacher owns it
        const groupDoc = await Group.findById(group);
        if (!groupDoc) {
            throw AppError.notFound("Group not found");
        }

        if (groupDoc.teacherId.toString() !== teacher.toString()) {
            throw AppError.forbidden("You are not allowed to create quizzes for this group");
        }

        const course = groupDoc.courseId;

        // Calculate total grade from questions
        const totalGrade = questions.reduce((sum, q) => sum + (q.points || 0), 0);

        const quiz = await this.model.create({
            title,
            description,
            group,
            course,
            teacher,
            questions,
            dueDate,
            duration,
            totalGrade,
            status: status || 'active'
        });

        return quiz;
    }

    /**
     * Get all quizzes for a group
     */
    async getQuizzesByGroup(groupId) {
        const quizzes = await this.model
            .find({ group: groupId, status: { $ne: 'archived' } })
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return quizzes;
    }

    /**
     * Get quiz by ID - sanitizes correct answers for students
     */
    async getQuizById(quizId, userId, userRole) {
        const quiz = await this.model.findById(quizId)
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email");

        if (!quiz) {
            throw AppError.notFound("Quiz not found");
        }

        // If user is a student, hide correct answers
        if (userRole === 'student') {
            const sanitizedQuiz = quiz.toObject();
            sanitizedQuiz.questions = sanitizedQuiz.questions.map(q => {
                const { correctAnswer, ...questionWithoutAnswer } = q;
                return questionWithoutAnswer;
            });
            return sanitizedQuiz;
        }

        return quiz;
    }

    /**
     * Get quizzes for a student based on their enrollments
     */
    async getQuizzesForStudent(studentId) {
        const Enrollment = mongoose.model("Enrollment");
        const enrollments = await Enrollment.find({ student: studentId }).populate("group");

        const groupIds = enrollments.map(e => e.group?._id).filter(Boolean);

        const quizzes = await this.model
            .find({
                group: { $in: groupIds },
                status: 'active'
            })
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        // Get submission status for each quiz
        const quizzesWithStatus = await Promise.all(
            quizzes.map(async (quiz) => {
                const submission = await QuizSubmission.findOne({
                    quiz: quiz._id,
                    student: studentId
                });

                return {
                    ...quiz.toObject(),
                    submissionStatus: submission ? (submission.isGraded ? 'graded' : 'submitted') : 'not-started'
                };
            })
        );

        return quizzesWithStatus;
    }

    /**
     * Submit quiz answers - auto-grade MCQ and True/False
     */
    async submitQuiz(quizId, studentId, answers) {
        // Check if quiz exists
        const quiz = await this.model.findById(quizId);
        if (!quiz) {
            throw AppError.notFound("Quiz not found");
        }

        // Check if student already submitted
        const existingSubmission = await QuizSubmission.findOne({
            quiz: quizId,
            student: studentId
        });

        if (existingSubmission) {
            throw AppError.badRequest("You have already submitted this quiz");
        }

        // Check if quiz is still open
        if (new Date() > quiz.dueDate) {
            throw AppError.badRequest("Quiz deadline has passed");
        }

        // Auto-grade MCQ and True/False questions
        let score = 0;
        let hasShortAnswer = false;

        answers.forEach(studentAnswer => {
            const question = quiz.questions.id(studentAnswer.questionId);
            if (!question) return;

            if (question.type === 'mcq' || question.type === 'true-false') {
                // Auto-grade
                const isCorrect = String(studentAnswer.answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
                if (isCorrect) {
                    score += question.points;
                }
            } else if (question.type === 'short-answer') {
                hasShortAnswer = true;
            }
        });

        const submission = await QuizSubmission.create({
            quiz: quizId,
            student: studentId,
            answers,
            score,
            isGraded: !hasShortAnswer // Auto-graded if no short answers
        });

        return submission;
    }

    /**
     * Get all submissions for a quiz (teacher view)
     */
    async getQuizSubmissions(quizId, teacherId) {
        // Verify teacher owns the quiz
        const quiz = await this.model.findById(quizId);
        if (!quiz) {
            throw AppError.notFound("Quiz not found");
        }

        if (quiz.teacher.toString() !== teacherId.toString()) {
            throw AppError.forbidden("You are not authorized to view these submissions");
        }

        const submissions = await QuizSubmission.find({ quiz: quizId })
            .populate("student", "name email")
            .sort({ submittedAt: -1 });

        return submissions;
    }

    /**
     * Get student's own quiz submissions
     */
    async getStudentQuizSubmissions(studentId, quizId = null) {
        const query = { student: studentId };
        if (quizId) {
            query.quiz = quizId;
        }

        const submissions = await QuizSubmission.find(query)
            .populate("quiz", "title totalGrade dueDate")
            .populate({
                path: "quiz",
                populate: {
                    path: "group course",
                    select: "title"
                }
            })
            .sort({ submittedAt: -1 });

        return submissions;
    }

    /**
     * Grade a submission manually (for short answer questions)
     */
    async gradeSubmission(submissionId, teacherId, additionalScore, feedback) {
        const submission = await QuizSubmission.findById(submissionId).populate('quiz');

        if (!submission) {
            throw AppError.notFound("Submission not found");
        }

        const quiz = await this.model.findById(submission.quiz._id);
        if (quiz.teacher.toString() !== teacherId.toString()) {
            throw AppError.forbidden("You are not authorized to grade this submission");
        }

        // Add additional score for manually graded questions
        submission.score += additionalScore || 0;
        submission.isGraded = true;

        if (feedback) {
            submission.feedback = feedback;
        }

        await submission.save();
        return submission;
    }

    /**
     * Get all quizzes created by a teacher
     */
    async getTeacherQuizzes(teacherId) {
        const quizzes = await this.model
            .find({ teacher: teacherId })
            .populate("group", "title")
            .populate("course", "title")
            .sort({ createdAt: -1 });

        return quizzes;
    }
}

export default QuizService;
