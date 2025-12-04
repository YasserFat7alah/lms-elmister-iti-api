import asyncHandler from "express-async-handler";

class GroupController {
    constructor(lessonService) {
        this.lessonService = lessonService;
    }

    /**
     * Create a new Lesson
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
        const lessons = await this.lessonService.getLessonsByGroup(groupId, page, limit);

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
            data: lesson,//success message
        });
    });


    /** 
     * Delete video using lessonId (only 1 video per lesson)
     * @route DELETE /api/v1/lessons/:id/video
     * */ 
    deleteVideo = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lesson = await this.lessonService.deleteVideo(id, req.user);
        res.status(200).json({
            success: true,
            data: lesson
        });
    });

    /** 
     * Delete document using lessonId and docId (multiple documents[] per lesson)
     * @route DELETE /api/v1/lessons/:id/document/:docId
     *  */ 
    deleteDocument = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { docId } = req.params.docId
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
            ...result, //success message
        });
    });


}

export default GroupController;