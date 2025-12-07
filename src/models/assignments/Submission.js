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

        content: { type: String },
        file: { type: String },
        grade: { type: Number },
        feedback: { type: String },

        submittedAt: {
            type: Date,
            default: Date.now
        },
    },
    { timestamps: true }
);

SubmissionSchema.index({ assignment: 1, student: 1 });
SubmissionSchema.index({ student: 1 });

export default mongoose.model("Submission", SubmissionSchema);
