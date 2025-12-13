import express from "express";
import newsletterController from "../controllers/newsletter.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
const { authenticate, authorize } = authMiddleware;

// Public: Subscribe / Unsubscribe
router.post("/subscribe", newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);

// Admin Only
router.use(authenticate, authorize("admin"));

router.get("/", newsletterController.getAllNewsletters); // Get History
router.delete("/:id", newsletterController.deleteNewsletter); // Delete History
router.get("/subscribers", newsletterController.getSubscribers); // Get Subscribers
router.post("/send", newsletterController.sendNewsletter);

export default router;
