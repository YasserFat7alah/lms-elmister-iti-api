import mongoose from "mongoose";

const { Schema } = mongoose;

const QuizSubmissionSchema = new Schema(
    {
        quiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: true
        },
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        answers: [{
            questionId: { type: String, required: true },
            answer: { type: Schema.Types.Mixed, required: true }
        }],

        score: {
            type: Number,
            default: 0
        },

        isGraded: {
            type: Boolean,
            default: false
        },

        feedback: { type: String },

        submittedAt: {
            type: Date,
            default: Date.now
        },
    },
    { timestamps: true }
);

QuizSubmissionSchema.index({ quiz: 1, student: 1 });
QuizSubmissionSchema.index({ student: 1 });

export default mongoose.model("QuizSubmission", QuizSubmissionSchema);
