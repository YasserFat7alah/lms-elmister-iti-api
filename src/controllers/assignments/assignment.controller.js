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

        // Convert FormData strings to proper types
        if (req.body.allowLateSubmission !== undefined) {
            req.body.allowLateSubmission = req.body.allowLateSubmission === 'true';
        }
        if (req.body.totalGrade) req.body.totalGrade = Number(req.body.totalGrade);
        if (req.body.latePenaltyPerDay) req.body.latePenaltyPerDay = Number(req.body.latePenaltyPerDay);
        if (req.body.maxLateDays) req.body.maxLateDays = Number(req.body.maxLateDays);

        const {
            title,
            description,
            lesson,
            // Remove this: course,
            group,
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
            // Remove this: course,
            group,
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
        const user = req.user;

        let assignments;
        if (user && user.role === 'student') {
            assignments = await this.assignmentService.getGroupAssignmentsForStudent(groupId, user._id);
        } else {
            assignments = await this.assignmentService.getAssignmentsByGroup(groupId);
        }

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

        const { assignmentId } = req.params;

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

    /**
     * Get assignments for a child (Parent access)
     * @route GET api/v1/assignments/student/:studentId
     * @auth parent
     */
    getChildAssignments = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const parentId = req.user._id;

        const assignments = await this.assignmentService.getAssignmentsForStudentByParent(studentId, parentId);

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
        res.status(200).json({
            success: true,
            data: assignment
        });
    });

    /**
     * Get all assignments created by the logged-in teacher
     * @route GET api/v1/assignments/teacher/my-assignments
     * @auth teacher
     */
    getTeacherAssignments = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const assignments = await this.assignmentService.getTeacherAssignments(teacherId);

        res.status(200).json({
            success: true,
            data: assignments
        });
    });

    updateAssignment = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const { assignmentId } = req.params;
        const file = req.file ? req.file : null;

        // Convert FormData strings to proper types
        if (req.body.allowLateSubmission !== undefined) {
            req.body.allowLateSubmission = req.body.allowLateSubmission === 'true';
        }
        if (req.body.totalGrade) req.body.totalGrade = Number(req.body.totalGrade);
        if (req.body.latePenaltyPerDay) req.body.latePenaltyPerDay = Number(req.body.latePenaltyPerDay);
        if (req.body.maxLateDays) req.body.maxLateDays = Number(req.body.maxLateDays);

        const {
            title,
            description,
            totalGrade,
            dueDate,
            allowLateSubmission,
            maxLateDays,
            latePenaltyPerDay
        } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (totalGrade) updateData.totalGrade = totalGrade;
        if (dueDate) updateData.dueDate = dueDate;
        if (allowLateSubmission !== undefined) {
            updateData.allowLateSubmission = allowLateSubmission;

            if (allowLateSubmission) {
                if (latePenaltyPerDay !== undefined) updateData.latePenaltyPerDay = latePenaltyPerDay;
                if (maxLateDays !== undefined) updateData.maxLateDays = maxLateDays;
            } else {
                // Remove late submission fields if disabled
                updateData.latePenaltyPerDay = undefined;
                updateData.maxLateDays = undefined;
            }
        }

        const assignment = await this.assignmentService.updateAssignment(
            assignmentId,
            teacherId,
            updateData,
            file
        );

        res.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            data: assignment
        });
    });

    /**
     * Delete an assignment >>> Only the teacher who created it can delete
     * @route DELETE api/v1/assignments/:assignmentId
     * @auth teacher
    */
    deleteAssignment = asyncHandler(async (req, res) => {
        const teacherId = req.user._id;
        const { assignmentId } = req.params;

        const result = await this.assignmentService.deleteAssignment(assignmentId, teacherId);

        res.status(200).json({
            success: true,
            message: result.message
        });
    });


}

export default AssignmentController;