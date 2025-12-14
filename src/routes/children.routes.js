import express from "express";
import childrenController from "../controllers/children.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createChildSchema, updateChildSchema } from "../validation/children.validation.js";

const router = express.Router();

const { authenticate } = authMiddleware;

/* --- --- --- AUTHENTICATED ROUTES (Parent Only) --- --- --- */
router.use(authenticate);

// Get all children for the authenticated parent
router.get("/", childrenController.getChildren);

// Get active subscriptions
router.get("/subscriptions", childrenController.getSubscriptions);

// Get teachers for children
router.get("/teachers", childrenController.getChildrenTeachers);

// Get upcoming sessions (Specific route MUST be before /:id)
router.get("/upcoming-sessions", childrenController.getUpcomingSessions);

// Get a child by ID (Generic route)
router.get("/:id", childrenController.getChildById);

// Create a new child
router.post("/", validate(createChildSchema), childrenController.createChild);

// Update a child
router.put("/:id", validate(updateChildSchema), childrenController.updateChild);

// Delete a child
router.delete("/:id", childrenController.deleteChild);

// Get course statistics for a child
router.get("/:childId/courses/:courseId/stats", childrenController.getChildCourseStats);

export { router as childrenRouter };
