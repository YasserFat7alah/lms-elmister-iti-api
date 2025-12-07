import asyncHandler from 'express-async-handler';

class AssignmentController {
    constructor(assignmentService) {
        this.assignmentService = assignmentService;
    }

    /**
     * Create a new assignment >>> Only teacher can create
     * @route POST api/v1/assignments
     * @auth teacher
     * @body { title, description, group, lesson, course, totalGrade, dueDate, file }
    */
    createAssignment = asyncHandler(async (req, res) => {

        const teacherId = req.user._id;
        const file = req.file ? req.file : null;

        const { title, description, group, lesson, course, totalGrade, dueDate } = req.body;

        const assignment = await this.assignmentService.createAssignment({
            title, description, group, lesson, course, teacher: teacherId, totalGrade, dueDate, file
        });

        res.status(201).json({
            success: true,
            data: assignment
        });
    });

    /**
     * Get assignments of a group
     * @route GET api/v1/assignments/:groupId
     * @params {groupId}
    */
    getAssignmentsByGroup = asyncHandler(async (req, res) => {

        const { groupId } = req.params;

        const assignments = await this.assignmentService.getAssignmentsByGroup(groupId);

        res.status(200).json({
            success: true,
            data: assignments
        });

    });

    /**
    * Get assignments of a lesson
    * @routes GET api/v1/assignments/:lessonId
    * @params {lessonId}
    */
    getAssignmentsByLesson = asyncHandler(async (req, res) => {

        const { lessonId } = req.params;

        const assignments = await this.assignmentService.getAssignmentsByLesson(lessonId);

        res.status(200).json({
            success: true,
            data: assignments
        });
    });

    /**
     * Get assignment by id
     * @route GET api/v1/assignments/:assignmentId
     * @params {assignmentId}
    */
    getAssignmentById = asyncHandler(async (req, res) => {

            const { id } = req.params;

            const assignment = await this.assignmentService.getAssignmentById(id);

            res.status(200).json({
                success: true,
                data: assignment
            });
    });
}

export default AssignmentController;