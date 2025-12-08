import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { enrollSchema } from './../../validation/enrollment.validation.js';
import enrollmentController from "../../controllers/enrollment.controller.js";

const router = express.Router();

const { authenticate, authorize } = authMiddleware;

router.use(authenticate);


router.post("/checkout/:groupId", authorize("parent"), validate(enrollSchema),
  enrollmentController.enroll
);

router.get("/me", authorize("parent"), enrollmentController.listMine);

router.delete(
  "/:enrollmentId",
  authorize("parent"),
  enrollmentController.cancel
);

export { router as enrollmentRouter };


