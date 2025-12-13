import mongoose from "mongoose";

const { Schema } = mongoose;

const AssignmentSchema = new Schema(
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

    totalGrade: {
      type: Number,
      default: 100
    },

    dueDate: {
      type: Date,
      required: true
    },


    file: {
      url: { type: String },
      publicId: { type: String },
      type: { type: String, default: "raw" }
    },

    allowLateSubmission: {
      type: Boolean,
      default: false
    },

    latePenaltyPerDay: {
      type: Number,
      default: 0
    },

    maxLateDays: {
      type: Number,
      default: 7
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
AssignmentSchema.pre("validate", function () {
  if (!this.group && !this.lesson) {
    throw new Error("Assignment must belong to a group or a lesson");
  } 
});

export default mongoose.model("Assignment", AssignmentSchema);
