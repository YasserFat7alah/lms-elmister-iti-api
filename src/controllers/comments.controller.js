import asyncHandler from "express-async-handler";

export class CommentController {
    constructor({ commentService }) {
        this.commentService = commentService;
    }

    createComment = asyncHandler(async (req, res) => {
        const { targetId, targetModel, content, parentId } = req.body;
        // Default targetModel if missing (less strict here but good practice)
        const model = targetModel || 'Course';

        const comment = await this.commentService.createComment(
            req.user._id,
            targetId,
            model,
            content,
            parentId
        );

        res.status(201).json({
            success: true,
            data: comment
        });
    });

    getComments = asyncHandler(async (req, res) => {
        const { targetId } = req.params;
        const { targetModel } = req.query;
        const model = targetModel || 'Course';

        const comments = await this.commentService.getCommentsByTarget(targetId, model);

        res.status(200).json({
            success: true,
            data: comments
        });
    });

    deleteComment = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await this.commentService.deleteComment(id, req.user._id);
        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default CommentController;
