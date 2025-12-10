import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        target: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'targetModel'
        },
        targetModel: {
            type: String,
            required: true,
            enum: ['Course'],
            default: 'Course'
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
    },
    { timestamps: true }
);

// Virtual for replies (if needed for deep population, though manual search is often better)
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parent'
});

export default mongoose.model("Comment", commentSchema);
