import mongoose from "mongoose";

const { Schema } = mongoose;

const SubmissionSchema = new Schema(
    {
        assignment: {
            type: Schema.Types.ObjectId,
            ref: "Assignment",
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

        content: { type: String },

        file: {
            url: { type: String },
            publicId: { type: String },
            type: { type: String, default: "raw" }
        },

        grade: { type: Number },

        feedback: { type: String },

        submittedAt: {
            type: Date,
            default: Date.now
        },

        isLate: {
            type: Boolean,
            default: false
        },

        lateDays: {
            type: Number,
            default: 0
        },

        penaltyApplied: {
            type: Number,
            default: 0
        },

        finalGrade: {
            type: Number
        },

        status: {
            type: String,
            enum: ['draft', 'submitted', 'graded', 'late'],
            default: 'draft'
        }
    },
    { timestamps: true }
);

SubmissionSchema.index({ assignment: 1, student: 1 });
SubmissionSchema.index({ student: 1 });

export default mongoose.model("Submission", SubmissionSchema);
