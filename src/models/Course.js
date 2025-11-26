import mongoose from "mongoose";

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
      publicId: { type: String }, // Needed for Cloudinary delete
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    gradeLevel: {
      type: String,
      enum: [
        "1","2","3","4","5","6","7","8",
        "9","10","11","12"
      ],
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

export default mongoose.model("Course", CourseSchema);