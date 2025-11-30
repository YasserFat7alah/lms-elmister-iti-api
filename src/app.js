import express from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import errorHandler from "./middlewares/error.middleware.js";
import { CLIENT_URL } from "./utils/constants.js";
import { authRouter } from "./routes/auth.routes.js";
import courseRouter from "./routes/course.routes.js";
import { userRouter } from "./routes/user.routes.js";
// import AppError from "./utils/AppError.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // or '*' for dev
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, // if sending cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);

app.get("/ping", (req, res) => { // health check endpoint
    res.json({ message: "pong" });
});


// app.all(/.*/, (req, res, next) => {
// }

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);

export default app;