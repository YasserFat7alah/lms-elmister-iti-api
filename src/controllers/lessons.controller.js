import asyncHandler from "express-async-handler";
import Group from "../models/Group.js";
import Lesson from "../models/Lesson.js";
import ParentProfile from "../models/users/ParentProfile.js";

class LessonController {
    constructor(lessonService) {
        this.lessonService = lessonService;
    }

    /**
     * Create a new Lesson (Schedule or Content)    
     * @route POST /api/v1/lessons
     */
    createLesson = asyncHandler(async (req, res) => {
        const files = req.files ? req.files : null;
        const lesson = await this.lessonService.createLesson(req.body, req.user, files);

        res.status(201).json({
            success: true,
            data: lesson,
        });
    });

    /**
     * Get All Lessons in a specific Group paginated
     * @route GET /api/v1/lessons/:groupId
     */
    getLessonsByGroup = asyncHandler(async (req, res) => {
        const { groupId } = req.params;
        const { page, limit } = req.query;
        const lessons = await this.lessonService.getLessonsByGroup(groupId, page, limit, req.user);

        res.status(200).json({
            success: true,
            data: lessons,
        });
    });
    /**
     * Update a Lesson by ID
     * @route PATCH /api/v1/lessons/:id
     */
    updateLesson = asyncHandler(async (req, res) => {
        const files = req.files ? req.files : null;
        const { id } = req.params;
        const lesson = await this.lessonService.updateLessonById(id, req.body, req.user, files);

        res.status(200).json({
            success: true,
            data: lesson,
        });
    });

    /**
     * Delete a Lesson and its content by Lesson ID
     * @route DELETE /api/v1/lessons/:id
     */
    deleteLesson = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lesson = await this.lessonService.deleteLesson(id, req.user);

        res.status(200).json({
            success: true,
            data: lesson,
        });
    });

    /** * Delete video using lessonId
     * @route DELETE /api/v1/lessons/:id/video
     */
    deleteVideo = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lesson = await this.lessonService.deleteVideo(id, req.user);
        res.status(200).json({
            success: true,
            data: lesson
        });
    });

    // * Get Single Lesson by ID
    //  * @route GET /api/v1/lessons/:id
    //  */
    getLessonById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lesson = await this.lessonService.getLessonById(id, req.user);

        res.status(200).json({
            success: true,
            data: lesson,
        });
    });

    /** * Delete document using lessonId and docId
     * @route DELETE /api/v1/lessons/:id/document/:docId
     */
    deleteDocument = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { docId } = req.params;
        const lesson = await this.lessonService.deleteDocument(id, docId, req.user);
        res.status(200).json({
            success: true,
            data: lesson
        });
    });

    /**
     * Reorder Lessons in a Group
     * @route PATCH /api/v1/lessons/reorder/:groupId
     */
    reorderLessons = asyncHandler(async (req, res) => {
        const { groupId } = req.params;
        const orderedLessons = req.body;
        const result = await this.lessonService.reorder(groupId, orderedLessons, req.user);

        res.status(200).json({
            success: true,
            ...result,
        });
    });

    addLessonMaterial = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { title, url, type } = req.body;

        const lesson = await this.lessonService.addMaterial(id, { title, url, type });

        res.status(200).json({
            success: true,
            message: "Material added successfully",
            data: lesson,
        });
    });

    deleteLessonMaterial = asyncHandler(async (req, res) => {
        const { id, materialId } = req.params;

        const lesson = await this.lessonService.removeMaterial(id, materialId);

        res.status(200).json({
            success: true,
            message: "Material deleted successfully",
            data: lesson,
        });
    });


    /**
         * Get All Lessons for Current User (Teacher or Student)
         * @route GET /api/v1/lessons
         */
    getAllMyLessons = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const role = req.user.role;
        const { date } = req.query; // Get date from query params

        let query = {};
        if (role === 'teacher') {
            const myGroups = await Group.find({ teacherId: userId }).select('_id');
            const groupIds = myGroups.map(g => g._id);
            query = { groupId: { $in: groupIds } };

        } else if (role === 'student') {
            const myGroups = await Group.find({ students: userId }).select('_id');
            const groupIds = myGroups.map(g => g._id);
            query = { groupId: { $in: groupIds } };

        } else if (role === 'parent') {
            const parentProfile = await ParentProfile.findOne({ user: userId });

            if (!parentProfile || !parentProfile.children || parentProfile.children.length === 0) {
                return res.status(200).json({ success: true, data: [] });
            }

            const childrenGroups = await Group.find({
                students: { $in: parentProfile.children }
            }).select('_id');

            const groupIds = childrenGroups.map(g => g._id);
            query = { groupId: { $in: groupIds } };
        }

        // Add date filter if provided
        if (date) {
            // Assume date is passed as YYYY-MM-DD or ISO string
            // We want to match the exact date stored in DB (assuming stored as YYYY-MM-DD string or Date object at midnight)
            // If stored as ISO string in DB, we might need regex or range. 
            // Based on existing code `new Date(lesson.date).toLocaleDateString()`, let's check how it's stored.
            // Usually safer to query by range for a full day if stored as Date.

            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(targetDate.getDate() + 1);

            // Reset times to ensure full day coverage
            targetDate.setHours(0, 0, 0, 0);
            nextDay.setHours(0, 0, 0, 0);

            query.date = {
                $gte: targetDate,
                $lt: nextDay
            };
        }

        const lessons = await Lesson.find(query)
            .populate('groupId', 'title')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json({
            success: true,
            data: lessons
        });
    });












    /**
     * Mark Attendance
     * @route POST /api/v1/lessons/:id/attendance
     */
    markAttendance = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { attendance } = req.body;

        const result = await this.lessonService.markAttendance(id, attendance, req.user);

        res.status(200).json({
            success: true,
            message: "Attendance updated successfully",
            data: result.attendance
        });
    });
}

export default LessonController;