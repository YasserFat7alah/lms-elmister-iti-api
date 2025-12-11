import BaseService from "./base.service.js";
import AppError from "../utils/app.error.js";

export class CommentService extends BaseService {
    constructor({ model }) {
        super(model);
    }

    /**
     * Create a comment or reply
     */
    async createComment(userId, targetId, targetModel, content, parentId = null) {
        let parent = null;
        if (parentId) {
            parent = await this.model.findById(parentId);
            if (!parent) throw AppError.notFound("Parent comment not found");
            // Optional: Check if parent belongs to same target
            if (parent.target.toString() !== targetId) throw AppError.badRequest("Parent comment target mismatch");
        }

        const comment = await super.create({
            user: userId,
            target: targetId,
            targetModel,
            content,
            parent: parentId
        });

        // Populate user for immediate UI update
        return comment.populate("user", "name avatar");
    }

    /**
     * Get comments for a target
     * Returns flat list or nested depending on frontend need. 
     * Here we return generic list with populate, frontend processes threading or we do basic aggregation.
     * Use simple find first.
     */
    async getCommentsByTarget(targetId, targetModel) {
        return this.model.find({ target: targetId, targetModel })
            .populate("user", "name avatar")
            .populate("parent") // to help threading
            .sort("createdAt");
    }

    /**
     * Delete comment
     */
    async deleteComment(commentId, userId) {
        const comment = await super.findById(commentId);
        if (!comment) throw AppError.notFound("Comment not found");

        // Ownership check or Admin
        if (comment.user.toString() !== userId.toString()) {
            // Add admin check logic if available, for now owner only
            throw AppError.forbidden("Not allowed to delete this comment");
        }

        // Ideally delete replies too or orphan them. 
        // For simple logic, we just delete the comment. Mongoose middleware could handle cascade if valid.
        await super.deleteById(commentId);

        // Delete replies?
        await this.model.deleteMany({ parent: commentId });

        return { message: "Comment deleted" };
    }
}

export default CommentService;
