import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },

    title: String,

    description: String,

    dueDate: Date,

    submitted: {
      type: Boolean,
      default: false,
    },

    feedback: String,

    createdAt: {
      type: Date,
      default: Date.now,
    },
    
  },
  { timestamps: true }
);

export default mongoose.model("Assignment", assignmentSchema);
