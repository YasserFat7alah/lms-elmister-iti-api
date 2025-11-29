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

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    thumbnail: {
      url: { type: String },
      publicId: { type: String },
      type: { type: String }
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
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    pricing: {
      isPaid: { type: Boolean, default: false },

      price: {
        type: Number,
        min: 0,
        required: function () {
          return this.pricing?.isPaid;
        },
      },

      currency: { type: String, default: "USD" },
    },

    language: {
      type: String,
      default: "English",
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

    totalReviews: {
      type: Number,
      default: 0,
    },

    totalStudents: {
      type: Number,
      default: 0,
    },

    totalLessons: {
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

export default mongoose.model("Course", CourseSchema);