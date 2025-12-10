import mongoose from "mongoose";
import { GRADE_LEVELS } from "../utils/constants.js";

const CourseSchema = new mongoose.Schema(
  {
    /* user-facing fields */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    subTitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    features: [{
      type: String,
      trim: true,
      maxlength: 300,
    }],

    thumbnail: {
      url: { type: String },
      publicId: { type: String },
      type: { type: String },
    },

    video: {
      url: { type: String },
      publicId: { type: String },
      type: { type: String },
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    gradeLevel: {
      type: String,
      enum: GRADE_LEVELS,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "in-review", "published", "archived"],
      default: "draft",
    },

    courseLanguage: {
      type: String,
      default: "English",
      lowercase: true,
    },

    tags: [{ type: String, trim: true }],

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    /* statistics */

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingsCount: {
      type: Number,
      default: 0,
    },

    totalStudents: {
      type: Number,
      default: 0,
    },

  },
  { timestamps: true }
);

CourseSchema.index({ teacherId: 1 });
CourseSchema.index({ tags: 1 });
CourseSchema.index({ status: 1 });
CourseSchema.index({ title: "text", description: "text" });

CourseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'target',
  match: { targetModel: 'Course' }
});

CourseSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'target',
  match: { targetModel: 'Course' }
});

// Ensure virtuals are included
CourseSchema.set('toObject', { virtuals: true });
CourseSchema.set('toJSON', { virtuals: true });

export default mongoose.model("Course", CourseSchema);