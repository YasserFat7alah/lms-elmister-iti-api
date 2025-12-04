import express from "express";
import enrollmentController from "../controllers/enrollment.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(auth.authenticate);

router.post(
  "/groups/:groupId/enroll",
  auth.authorize("parent"),
  enrollmentController.enroll
);

router.get("/me", auth.authorize("parent"), enrollmentController.listMine);

router.delete(
  "/:enrollmentId",
  auth.authorize("parent"),
  enrollmentController.cancel
);

export { router as enrollmentRouter };


