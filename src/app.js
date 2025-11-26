import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/error.middleware.js";
import courseRouter from "./routes/course.routes.js";
// import ApiError from "./utils/ApiError.js";

const app = express();

/* --- --- --- DB Connection --- --- --- */
connectDB();

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(cors());
app.use(express.json());

/* --- --- --- END POINTS --- --- --- */
app.use("/api/v1/courses", courseRouter);

app.get("/ping", (req, res) => {
    res.json({ message: "pong" });
});

// app.all(/.*/, (req, res, next) => {
// }

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);

export default app;