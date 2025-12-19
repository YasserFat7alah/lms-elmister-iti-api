import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import mongoose from 'mongoose';
import Conversation from './models/chat/Conversation.js';
import passport from "./config/passport/index.js";
import AppError from "./utils/app.error.js";
import errorHandler from "./middlewares/error.middleware.js";
import { CLIENT_URL } from "./utils/constants.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import appRouter from "./routes/index.js";

const app = express();
console.log("App restarting...");

/* --- --- --- DB Connection --- --- --- */
connectDB();

// Sync conversation indexes after DB connection
mongoose.connection.once('open', async () => {
    try {
        await Conversation.syncIndexes();
        console.log('[DB]  Conversation indexes synced');
    } catch (err) {
        console.error('[DB]  Failed to sync Conversation indexes', err.message || err);
    }
});

/* --- --- --- WEBHOOKS --- --- --- */
app.use('/api/v1/webhooks', webhookRouter);

/* --- --- --- MIDDLEWARES --- --- --- */
app.use(passport.initialize());
app.use(cors({
    origin: CLIENT_URL ||  https:lms-elmister-iti-3bpn9d15i-omar12142s-projects.vercel.app/ , // or '*' for dev
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // if sending cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1", appRouter);

/* --- --- --- HEALTH CHECK --- --- --- */
app.get("/", (req, res) => {
    res.status(200).json({
        status: 'success',
        message: "Welcome to Elmister api service --->",
        timestamp: new Date().toISOString(),
    });
});

app.get("/ping", (req, res) => {
    res.status(200).json({
        status: 'success',
        message: "pong",
        timestamp: new Date().toISOString(),
    });
});

/* --- --- --- FALLBACK --- --- --- */
app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    next(AppError.notFound(`Cannot ${req.method} on '${req.originalUrl}'`));
});

/* --- --- --- ERROR HANDLER --- --- --- */
app.use(errorHandler);


export default app;
