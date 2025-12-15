import mongoose from "mongoose";

const { Schema } = mongoose;

const QuestionSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['mcq', 'true-false', 'short-answer'],
        required: true
    },
    options: {
        type: [String],
        // Required only for MCQ questions
        validate: {
            validator: function (options) {
                if (this.type === 'mcq') {
                    return options && options.length >= 2;
                }
                return true;
            },
            message: 'MCQ questions must have at least 2 options'
        }
    },
    correctAnswer: {
        type: Schema.Types.Mixed, // String for mcq/true-false, can be flexible for short-answer
        required: true
    },
    points: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: true });

const QuizSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 200
        },
        description: {
            type: String,
            trim: true
        },
        group: {
            type: Schema.Types.ObjectId,
            ref: "Group",
            required: true
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
        questions: {
            type: [QuestionSchema],
            required: true,
            validate: {
                validator: function (questions) {
                    return questions && questions.length > 0;
                },
                message: 'Quiz must have at least one question'
            }
        },
        dueDate: {
            type: Date,
            required: true
        },
        duration: {
            type: Number, // in minutes
            min: 1,
            default: null // null means no time limit
        },
        totalGrade: {
            type: Number,
            required: true,
            min: 1
        },
        status: {
            type: String,
            enum: ['active', 'archived', 'draft'],
            default: 'active'
        }
    },
    { timestamps: true }
);

// Auto-calculate totalGrade from questions if not provided
QuizSchema.pre('validate', function () {
    if (this.questions && this.questions.length > 0) {
        const calculatedTotal = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        if (!this.totalGrade) {
            this.totalGrade = calculatedTotal;
        }
    }
});

// Indexes for performance
QuizSchema.index({ group: 1, status: 1 });
QuizSchema.index({ teacher: 1 });
QuizSchema.index({ dueDate: 1 });

export default mongoose.model("Quiz", QuizSchema);
