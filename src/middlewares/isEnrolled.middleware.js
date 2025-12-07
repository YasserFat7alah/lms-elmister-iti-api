import Enrollment from "../models/Enrollment.js";
import Assignment from "../models/Assignment.js";
import AppError from "../utils/app.error.js";


const isEnrolled = () => {
    return async (req, res, next) => {

        const studentId = req.user._id;
        const { assignmentId } = req.body;

        if (!assignmentId)
            return next(AppError.badRequest("AssignmentId is required"));

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment)
            return next(AppError.notFound("Assignment not found"));

        const isEnrolled = await Enrollment.findOne({
            student: studentId,
            group: assignment.group
        });
        if (!isEnrolled)
            return next(AppError.forbidden("You are not enrolled in this group"));


        // Pass it to the next middleware
        req.assignment = assignment;
        req.groupId = assignment.group;

        next();
    };
};

export default isEnrolled;
