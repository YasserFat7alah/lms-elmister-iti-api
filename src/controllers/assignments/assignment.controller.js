import asyncHandler from 'express-async-handler';

class AssignmentController {
    constructor(assignmentService) {
        this.assignmentService = assignmentService;
    }

    /**
     * Create a new assignment >>> Only teacher can create
     * @route POST api/v1/assignments
     * @auth teacher
     * @body { title, description, group, lesson, totalGrade, dueDate, file }
    */
    createAssignment = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const file = req.file ? req.file : null;

        const { 
            title, 
            description, 
            lesson,  
            group ,
            totalGrade, 
            dueDate,
            allowLateSubmission,
            maxLateDays,
            latePenaltyPerDay
        } = req.body;

        const assignment = await this.assignmentService.createAssignment({
            title, 
            description, 
            lesson, 
            group ,
            teacher: teacherId, 
            totalGrade, 
            dueDate,
            allowLateSubmission,
            maxLateDays,
            latePenaltyPerDay,
            file
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

            const {assignmentId} = req.params;

            const assignment = await this.assignmentService.getAssignmentById(assignmentId);

            res.status(200).json({
                success: true,
                data: assignment
            });
    });


     // Get all assignments for logged-in student
    getStudentAssignments = asyncHandler(async (req, res) => {
        const studentId = req.user._id;

        const assignments = await this.assignmentService.getAssignmentsForStudent(studentId);

        res.status(200).json({
            success: true,
            data: assignments
        });
    });

    // Optional: Get assignment details (if student wants single assignment view)
    getAssignmentDetails = asyncHandler(async (req, res) => {
        const { assignmentId } = req.params;
        const studentId = req.user._id;

        // Optional: check enrollment in the assignment's group or course
        const assignment = await this.assignmentService.getAssignmentById(assignmentId);

        // TODO: optionally check if student is enrolled
        res.status(200).json({
            success: true,
            data: assignment
        });
    });
}

export default AssignmentController;