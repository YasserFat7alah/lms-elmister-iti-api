import express from "express";
import { publicRouter } from "./public.routes.js";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./users/user.routes.js";
import { adminRouter } from "./users/admin.routes.js";
import { teacherRouter } from "./users/teacher.routes.js";
import { reviewRouter } from "./courses/reviews.routes.js";
import { courseRouter } from "./courses/course.routes.js";
import { groupRouter } from "./courses/group.routes.js";
import { lessonRouter } from "./courses/lesson.routes.js";
import { enrollmentRouter } from "./users/enrollment.routes.js";
import { payoutRouter } from "./users/payout.routes.js";
import { testimonialRouter } from "./testimonial.routes.js";
import commentRouter from "./courses/comments.routes.js";
import { assignmentRouter } from "./assignments/assignment.routes.js";
import { submissionRouter } from "./assignments/submission.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { cloudinaryRouter } from "./helpers/cloudinary.routes.js";
import newsletterRouter from "./newsletter.routes.js";
import ticketRouter from "./ticket.routes.js";
import { chatRouter } from "./chat.routes.js";



const router = express.Router();

router.use("/public", publicRouter);
router.use("/auth", authRouter);
router.use("/testimonials", testimonialRouter);

/* --- --- --- USER ENDPOINTS --- --- --- */
router.use("/users", userRouter);
router.use("/admins", adminRouter);
router.use("/teachers", teacherRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/payouts", payoutRouter);
router.use("/reviews", reviewRouter);
router.use("/comments", commentRouter);
router.use("/newsletter", newsletterRouter); // Added
router.use("/tickets", ticketRouter); // Added

/* --- --- --- COURSE ENDPOINTS --- --- --- */
router.use("/courses", courseRouter);
router.use("/groups", groupRouter);
router.use("/lessons", lessonRouter);

router.use("/notifications", notificationRouter);
router.use("/assignments", assignmentRouter);
router.use("/submissions", submissionRouter);

/* --- --- --- CHAT ENDPOINTS --- --- --- */
router.use("/chat", chatRouter);


/* --- --- --- HELPERS ENDPOINTS --- --- --- */
router.use("/cloudinary", cloudinaryRouter);


export default router;