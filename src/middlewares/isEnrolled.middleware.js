import Assignment from "../models/assignments/Assignment.js";
import Enrollment from "../models/Enrollment.js";
import StudentProfile from "../models/users/StudentProfile.js";
import AppError from "../utils/app.error.js";


/**
 * middleware checks if 
 * @role student if he is enrolled in a given group or assignment, 
 * @role Teacher is always allowed,
 * @role Parent is allowed if any of their children are enrolled
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Callback to call next middleware
 * @throws {forbidden} - If user is not enrolled or parent has no enrolled children
 */

const isEnrolled = () => {
    return async (req, res, next) => {
        try {
            // const studentId = req.user._id;
            const user = req.user;
            //teacher is always allowed
            if (user.role === "teacher") return next();

            //Get assignmentId or groupId from body or params
            const assignmentId = req.body?.assignmentId || req.params?.assignmentId || null;
            const groupIdFromRequest = req.body?.group || req.params?.groupId || null;


            let groupId;

            // ........ If assignmentId provided >> get group from it .......
            if (assignmentId) {
                const assignment = await Assignment.findById(assignmentId).select("group");

                if (!assignment) {
                    return next(AppError.notFound("Assignment not found"));
                }

                groupId = assignment.group;
                req.assignment = assignment;
            }

            // ....... If groupId provided directly ......
            if (!groupId && groupIdFromRequest) {
                groupId = groupIdFromRequest;
            }

            if (!groupId) {
                return next(AppError.badRequest("GroupId or AssignmentId is required"));
            }


            // Student logic : check if they are enrolled
            if (user.role === "student") {
                const enrolled = await Enrollment.findOne({
                    student: user._id,
                    group: groupId
                });

                if (!enrolled) return next(AppError.forbidden("You are not enrolled in this group"));
            }


            // Parent logic: check if any of their children are enrolled
            if (user.role === "parent") {
                const children = await StudentProfile.find({ parent: user._id }).select("user");
                const childrenIds = children.map(child => child.user);

                const enrolled = await Enrollment.findOne({
                    student: { $in: childrenIds },
                    group: groupId
                });

                if (!enrolled) return next(AppError.forbidden("None of your children are enrolled in this group"));
            }

            // Pass for next middlewares
            req.groupId = groupId;
            next();

        } catch (error) {
            next(error);
        }
    };
};

export default isEnrolled;
