import express from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import errorHandler from "./middlewares/error.middleware.js";
import { CLIENT_URL } from "./utils/constants.js";
import { authRouter } from "./routes/auth.routes.js";
import { groupRouter } from "./routes/group.routes.js";
import {courseRouter} from "./routes/course.routes.js";
import { userRouter } from "./routes/user.routes.js";
import passport from "./config/passport/index.js";
import AppError from "./utils/app.error.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(passport.initialize());

app.use(cors(
    {
        origin: CLIENT_URL,
        credentials: true
    }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/groups", groupRouter);


app.get("/ping", (req, res) => { // health check endpoint
    res.json({ message: "pong" });
});

/* --- --- --- FALLBACK --- --- --- */
app.use((req, res, next) => {
    next(AppError.notFound());
});

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);

export default app;