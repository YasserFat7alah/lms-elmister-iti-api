import mongoose from "mongoose";


const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        target: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'targetModel'
        },
        targetModel: {
            type: String,
            required: true,
            enum: ['Course', 'User']
        },
        rating: {
            type: Number,
            min: 1, max: 5,
            required: true
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 100
        }

    }, { timestamps: true });

export default mongoose.model("Review", reviewSchema);