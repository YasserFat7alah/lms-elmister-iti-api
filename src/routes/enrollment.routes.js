import express from "express";
import enrollmentController from "../controllers/enrollment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

const { authenticate, authorize } = authMiddleware;

router.use(authenticate);

router.post("/checkout/:groupId", authorize("parent"),
  enrollmentController.enroll
);

router.get("/me", authorize("parent"), enrollmentController.listMine);

router.delete(
  "/:enrollmentId",
  authorize("parent"),
  enrollmentController.cancel
);

export { router as enrollmentRouter };


