import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
// import ApiError from "./utils/ApiError.js";

const app = express();

//=======DB Connection=======
connectDB();

//=======MIDDLEWARES=======
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// ====== ROUTES ======
app.use("/api/v1/auth", authRouter);



//=======ROUTES=======


// app.all(/.*/, (req, res, next) => {

// }

//===============================Error Handler===================================
app.use(errorHandler);


export default app;