import express from "express";
import Comment from "../../models/Comment.js";
import CommentService from "../../services/comment.service.js";
import CommentController from "../../controllers/comments.controller.js";
import auth from "../../middlewares/auth.middleware.js";

const router = express.Router();

const { authenticate, authorize } = auth;

const commentService = new CommentService({ model: Comment });
const commentController = new CommentController({ commentService });

router
    .route("/")
    .post(authenticate, authorize("student", "admin", "teacher", "parent"), commentController.createComment);

router
    .route("/:targetId")
    .get(commentController.getComments);

router
    .route("/:id")
    .delete(authenticate, authorize("admin", "student", "parent", "teacher"), commentController.deleteComment);

export default router;
