import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import errorHandler from "./middlewares/error.middleware.js";
import passport from "./config/passport/index.js";
import AppError from "./utils/app.error.js";
import { CLIENT_URL } from "./utils/constants.js";
import courseRouter from "./routes/course.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { groupRouter } from "./routes/group.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { teacherRouter } from "./routes/users/teacher.routes.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(passport.initialize());

app.use(cookieParser());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/teachers", teacherRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/groups", groupRouter);



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