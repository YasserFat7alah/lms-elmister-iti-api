import mongoose from "mongoose";

const { Schema } = mongoose;

const QuizSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },

        // Target: either group or lesson
        group: {
            type: Schema.Types.ObjectId,
            ref: "Group"
        },
        lesson: {
            type: Schema.Types.ObjectId,
            ref: "Lesson"
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true
        },

        teacher: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        questions: [{
            text: { type: String, required: true },
            type: {
                type: String,
                enum: ['mcq', 'short-answer', 'true-false'],
                required: true
            },
            points: { type: Number, required: true },
            options: [String], // For MCQ
            correctAnswer: { type: Schema.Types.Mixed, required: true } // String or boolean
        }],

        totalGrade: {
            type: Number,
            default: 100
        },

        duration: {
            type: Number, // in minutes
            required: true
        },

        dueDate: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ['active', 'archived', 'draft'],
            default: 'active'
        }

    },
    { timestamps: true }
);

// Ensure either group or lesson is defined
QuizSchema.pre("validate", function () {
    if (!this.group && !this.lesson) {
        throw new Error("Quiz must belong to a group or a lesson");
    }
});

export default mongoose.model("Quiz", QuizSchema);
