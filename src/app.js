import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import courseRouter from "./routes/course.routes.js";
// import ApiError from "./utils/ApiError.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(cors(
    {
        origin: process.env.CLIENT_URL || 'http://localhost:5000',
        credentials: true
    }
));
app.use(express.json());

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/auth",authRouter)
app.use("/api/v1/courses", courseRouter);

app.get("/ping", (req, res) => { // health check endpoint
    res.json({ message: "pong" });
});


// app.all(/.*/, (req, res, next) => {
// }

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);

export default app;