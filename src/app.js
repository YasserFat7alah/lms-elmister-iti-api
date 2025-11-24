import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/error.middleware.js";
// import ApiError from "./utils/ApiError.js";

const app = express();

//=======DB Connection=======
connectDB();

//=======MIDDLEWARES=======
app.use(cors());
app.use(express.json());



//=======ROUTES=======
// app.use("/",  )
//...
//....

// app.all(/.*/, (req, res, next) => {

// }

//===============================Error Handler===================================
app.use(errorHandler);


export default app;