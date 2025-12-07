import Enrollment from "../models/Enrollment.js";
import AppError from "../utils/app.error.js";

const ACTIVE_STATUSES = ["active", "trialing"];

const isEnrolled = () => {
    return async (req, res, next) => {

        const studentId = req.user._id;

        // groupId from params or body or query
        const groupId =
            req.params.groupId ||
            req.body.groupId ||
            req.query.groupId;

        if (!groupId) {
            return next(
                AppError.badRequest("groupId is required to check enrollment")
            );
        }

        const enrollment = await Enrollment.findOne({
            student: studentId,
            group: groupId,
            status: { $in: ACTIVE_STATUSES }
        }).populate("group course");

        if (!enrollment) {
            return next(
                AppError.forbidden(
                    "You are not enrolled in this group or your subscription is inactive"
                )
            );
        }
        // Checking if trial period has ended (currentPeriodEnd)
        if (enrollment.status === "trialing" && enrollment.currentPeriodEnd) {
            const now = new Date();
            const trialEnd = new Date(enrollment.currentPeriodEnd);

            if (now > trialEnd) {
                return next(
                    AppError.forbidden("Your trial period has ended. Please subscribe to continue.")
                );
            }
        }

        // Pass it to the next middleware
        req.enrollment = enrollment;
        req.course = enrollment.course;
        req.group = enrollment.group;

        next();
    };
};

export default isEnrolled;
