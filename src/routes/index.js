import express from "express";
import { publicRouter } from "./public.routes.js";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./user.routes.js";
import { adminRouter } from "./users/admin.routes.js";
import { teacherRouter } from "./users/teacher.routes.js";
import { reviewRouter } from "./reviews.routes.js";
import { courseRouter } from "./courses/course.routes.js";
import { groupRouter } from "./courses/group.routes.js";
import { lessonRouter } from "./lesson.routes.js";
import { enrollmentRouter } from "./users/enrollment.routes.js";
import { payoutRouter } from "./payout.routes.js";
import { testimonialRouter } from "./testimonial.routes.js";


const router = express.Router();

router.use("/public", publicRouter);
router.use("/auth",authRouter);
router.use("/testimonials", testimonialRouter);

/* --- --- --- USER ENDPOINTS --- --- --- */
router.use("/users", userRouter);
router.use("/admins", adminRouter);
router.use("/teachers", teacherRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/payouts", payoutRouter);
router.use("/reviews", reviewRouter);

/* --- --- --- COURSE ENDPOINTS --- --- --- */
router.use("/courses", courseRouter);
router.use("/groups", groupRouter);
router.use("/lessons", lessonRouter);



export default router;