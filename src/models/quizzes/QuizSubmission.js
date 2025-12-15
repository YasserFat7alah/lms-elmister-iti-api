import mongoose from "mongoose";

const { Schema } = mongoose;

const AnswerSchema = new Schema({
    questionId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    answer: {
        type: Schema.Types.Mixed, // Can be string, boolean, or array depending on question type
        required: true
    }
}, { _id: false });

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
        answers: {
            type: [AnswerSchema],
            required: true
        },
        score: {
            type: Number,
            default: 0,
            min: 0
        },
        isGraded: {
            type: Boolean,
            default: false
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        feedback: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

// Compound index to ensure one submission per student per quiz
QuizSubmissionSchema.index({ quiz: 1, student: 1 }, { unique: true });
QuizSubmissionSchema.index({ student: 1 });
QuizSubmissionSchema.index({ quiz: 1 });

export default mongoose.model("QuizSubmission", QuizSubmissionSchema);
