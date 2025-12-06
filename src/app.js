import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import errorHandler from "./middlewares/error.middleware.js";
import passport from "./config/passport/index.js";
import AppError from "./utils/app.error.js";
import { CLIENT_URL } from "./utils/constants.js";
import { authRouter } from "./routes/auth.routes.js";
import {courseRouter} from "./routes/course.routes.js";
import { groupRouter } from "./routes/group.routes.js";
import { lessonRouter } from "./routes/lesson.routes.js";
import { reviewRouter } from "./routes/reviews.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { teacherRouter } from "./routes/users/teacher.routes.js";
import { enrollmentRouter } from "./routes/enrollment.routes.js";
import { payoutRouter } from "./routes/payout.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { testimonialRouter } from "./routes/testimonial.routes.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- WEBHOOKS --- --- --- */
app.use('/api/v1/webhooks', webhookRouter);

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(passport.initialize());
app.use(cors({
    origin: CLIENT_URL || 'http://localhost:3000', // or '*' for dev
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true, // if sending cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/teachers", teacherRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/lessons", lessonRouter);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use("/api/v1/payouts", payoutRouter);
app.use("/api/v1/testimonials", testimonialRouter);



/* --- --- --- HEALTH CHECK --- --- --- */
app.get("/ping", (req, res) => {
    res.status(200).json({ 
        status: 'success', 
        message: "pong",
        timestamp: new Date().toISOString(),
    });
});

/* --- --- --- FALLBACK --- --- --- */
app.use((req, res, next) => {
    next(AppError.notFound(`Cannot ${req.method} on '${req.originalUrl}'`));
});

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);

export default app;