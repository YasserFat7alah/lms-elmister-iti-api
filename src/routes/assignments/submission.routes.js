import express from "express";
import SubmissionController from "../../controllers/assignments/submission.controller.js";
import SubmissionService from "../../services/assignments/submission.service.js";
import AssignmentService from "../../services/assignments/assignment.service.js";
import Submission from "../../models/assignments/Submission.js";
import Assignment from "../../models/assignments/Assignment.js";
import auth from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { gradeSchema, submissionSchema } from "../../validation/assignments/submission.validation.js";
import multer from "../../middlewares/multer.middleware.js";
import isEnrolled from "../../middlewares/isEnrolled.middleware.js";

const router = express.Router();
//.............................................Middlewares......................................
const upload = multer.single('document');
const { authenticate, authorize } = auth;
//.............................................Instances.........................................
const submissionService = new SubmissionService(Submission);
const assignmentService = new AssignmentService(Assignment);
const submissionController = new SubmissionController({ submissionService, assignmentService });

//.........................................Protected routes........................................

router.use(authenticate);
// ...................................Student & Parent Routes.......................................

// Submit an assignment (submission)
router.post("/:assignmentId", authorize("student"), isEnrolled(), upload,validate(submissionSchema), submissionController.submitAssignment);

// Get his own submission for an assignment (student "owner", parent "Children")
router.get( "/:assignmentId", authorize("student", "parent") , isEnrolled(),submissionController.getSubmissionsByAssignment);

//..........................................Teacher Routes.........................................

// Grade a submission (teacher only)
router.patch("/:submissionId/grade", authorize("teacher"), validate(gradeSchema), submissionController.gradeSubmission);

// Get all submissions for an assignment (teacher only)
router.get("/:assignmentId/all", authorize("teacher"), submissionController.getSubmissionsForTeacher);

export { router as submissionRouter };