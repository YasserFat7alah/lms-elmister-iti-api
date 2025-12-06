import express from "express";
import webhookController from "../controllers/webhook.controller.js";

const router = express.Router();

/* --- --- --- WEBHOOK ROUTES --- --- --- */
router.post("/enrollments", express.raw({ type: 'application/json' }), webhookController.handleWebhook);

export { router as webhookRouter };