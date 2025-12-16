import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import QuizSubmission from "../../models/assignments/QuizSubmission.js";
import Group from "../../models/Group.js";
import Lesson from "../../models/Lesson.js";
import Enrollment from "../../models/Enrollment.js";
import mongoose from "mongoose";

class QuizService extends BaseService {
    constructor(model) {
        super(model);
    }

    async createQuiz(data) {
        console.log("Creating Quiz with data:", JSON.stringify(data, null, 2));
        const { group, lesson, teacher } = data;
        let course;

        // Group logic
        if (group) {
            const groupDoc = await Group.findById(group);
            if (!groupDoc) throw AppError.notFound("Group not found");
            if (groupDoc.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create quizzes for this group");
            }
            course = groupDoc.courseId;
        }

        // Lesson logic
        if (lesson) {
            const lessonDoc = await Lesson.findById(lesson).populate("groupId");
            if (!lessonDoc) throw AppError.notFound("Lesson not found");
            if (!lessonDoc.groupId) throw AppError.badRequest("Lesson is not linked to any group");
            if (lessonDoc.groupId.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create quizzes for this lesson");
            }
            course = lessonDoc.groupId.courseId;
            // Ensure group is set if lesson is used
            data.group = lessonDoc.groupId._id;
        }

        if (!course) {
            throw AppError.badRequest("Quiz must belong to a group or a lesson");
        }

        data.course = course;

        // Auto-calculate totalGrade from questions if not provided
        if (data.questions && Array.isArray(data.questions)) {
            const sumPoints = data.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
            if (sumPoints > 0) {
                data.totalGrade = sumPoints;
            }
        }

        return await this.model.create(data);
    }

    async getQuizById(id) {
        console.log("Fetching Quiz ID:", id);
        const quiz = await this.model.findById(id)
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email");

        if (!quiz) throw AppError.notFound("Quiz not found");
        return quiz;
    }

    async getQuizzesByGroup(groupId) {
        return await this.model.find({ group: groupId })
            .populate("teacher", "name email")
            .sort({ createdAt: -1 });
    }

    async getGroupQuizzesForStudent(groupId, studentId) {
        const quizzes = await this.model.find({ group: groupId, status: 'active' })
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return await this.enrichQuizzesWithStatus(quizzes, studentId);
    }

    async getTeacherQuizzes(teacherId) {
        return await this.model.find({ teacher: teacherId })
            .populate("group", "title")
            .populate("course", "title")
            .sort({ createdAt: -1 });
    }

    async submitQuiz(quizId, studentId, answers) {
        // 1. Check if already submitted
        const existing = await QuizSubmission.findOne({ quiz: quizId, student: studentId });
        if (existing) throw AppError.badRequest("You have already submitted this quiz");

        const quiz = await this.model.findById(quizId);
        if (!quiz) throw AppError.notFound("Quiz not found");

        // 2. Auto-grade
        let score = 0;
        let requiresManualGrading = false;

        quiz.questions.forEach(question => {
            const studentAnswerObj = answers.find(a => a.questionId === question._id.toString());
            const val = studentAnswerObj ? studentAnswerObj.answer : null;

            if (question.type === 'mcq' || question.type === 'true-false') {
                // strict string comparison
                if (String(val) === String(question.correctAnswer)) {
                    score += question.points;
                }
            } else {
                requiresManualGrading = true;
            }
        });

        // 3. Create Submission
        const submission = await QuizSubmission.create({
            quiz: quizId,
            student: studentId,
            answers,
            score,
            isGraded: !requiresManualGrading
        });

        return submission;
    }

    async getSubmission(submissionId) {
        const submission = await QuizSubmission.findById(submissionId)
            .populate("student", "name email")
            .populate("quiz");

        if (!submission) throw AppError.notFound("Submission not found");
        return submission;
    }

    async getQuizSubmissions(quizId) {
        return await QuizSubmission.find({ quiz: quizId })
            .populate("student", "name email")
            .sort({ submittedAt: -1 });
    }

    async gradeSubmission(submissionId, additionalScore, feedback) {
        const submission = await QuizSubmission.findById(submissionId);
        if (!submission) throw AppError.notFound("Submission not found");

        if (additionalScore) {
            submission.score += additionalScore;
        }
        submission.feedback = feedback;
        submission.isGraded = true;

        await submission.save();
        return submission;
    }

    // Get all quizzes for a student (via parent)
    async getQuizzesForStudentByParent(studentId, parentId) {
        const StudentProfile = mongoose.model("StudentProfile");
        const isLinked = await StudentProfile.findOne({ user: studentId, parent: parentId });

        if (!isLinked) {
            throw AppError.forbidden("You do not have access to this student's data");
        }

        // Find quizzes where the student is enrolled in the group/course
        const Enrollment = mongoose.model("Enrollment");
        const enrollments = await Enrollment.find({ student: studentId });
        const groupIds = enrollments.map(e => e.group).filter(Boolean);

        const quizzes = await this.model.find({ group: { $in: groupIds }, status: 'active' })
            .populate("group", "title")
            .populate("course", "title")
            .sort({ dueDate: 1 });

        return await this.enrichQuizzesWithStatus(quizzes, studentId);
    }

    async getStudentSubmissions(studentId, quizId) {
        const query = { student: studentId };
        if (quizId) {
            query.quiz = quizId;
        }
        return await QuizSubmission.find(query)
            .populate("quiz", "title totalGrade")
            .sort({ submittedAt: -1 });
    }

    // Helper: Enrich quizzes with submission status for a student
    async enrichQuizzesWithStatus(quizzes, studentId) {
        const quizIds = quizzes.map(q => q._id);
        const submissions = await QuizSubmission.find({
            quiz: { $in: quizIds },
            student: studentId
        });

        const submissionMap = {};
        submissions.forEach(sub => {
            submissionMap[sub.quiz.toString()] = sub;
        });

        return quizzes.map(quiz => {
            const submission = submissionMap[quiz._id.toString()];
            const quizObj = quiz.toObject(); // Convert to plain object to attach new fields

            if (submission) {
                quizObj.myScore = submission.score;
                quizObj.submissionStatus = submission.isGraded ? 'graded' : 'submitted';
                quizObj.isSubmitted = true;
            } else {
                quizObj.myScore = 0;
                quizObj.submissionStatus = 'pending';
                quizObj.isSubmitted = false;
            }
            return quizObj;
        });
    }

    // For Student: Get my quizzes
    async getStudentQuizzes(studentId) {
        const enrollments = await Enrollment.find({ student: studentId });
        const groupIds = enrollments.map(e => e.group).filter(Boolean);

        const quizzes = await this.model.find({ group: { $in: groupIds }, status: 'active' })
            .populate("group", "title")
            .populate("course", "title")
            .sort({ dueDate: 1 });

        return await this.enrichQuizzesWithStatus(quizzes, studentId);
    }
}

export default QuizService;
