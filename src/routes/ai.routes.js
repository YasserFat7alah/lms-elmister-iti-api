import express from "express";
import ragService from "../services/ragService.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";

const router = express.Router();

/* --- --- --- AI CONTROLLER LOGIC (Inline for simplicity as per request) --- --- --- */

/**
 * Seed KnowledgeBase
 * @route POST /api/v1/ai/seed
 */
router.post("/seed", asyncHandler(async (req, res) => {
    const result = await ragService.seedInitialData();
    res.status(200).json({ success: true, ...result });
}));

/**
 * Handle AI Chat
 * @route POST /api/v1/ai/chat
 */
router.post("/chat", asyncHandler(async (req, res) => {
    const { message, context, userDetails } = req.body;

    if (!message) {
        throw AppError.badRequest("Message is required.");
    }

    let data;

    if (context === "support") {
        data = await ragService.handleSupportQuery(message);
    } else if (context === "builder") {
        data = await ragService.handleCourseBuilder(message, userDetails);
    } else if (context === "extract") {
        data = await ragService.extractCourseDetails(message);
    } else {
        throw AppError.badRequest("Invalid context. Must be 'support', 'builder', or 'extract'.");
    }

    res.status(200).json({
        success: true,
        data,
    });
}));

export { router as aiRouter };
