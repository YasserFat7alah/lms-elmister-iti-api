import mongoose from "mongoose";

const TeacherProfileSchema = new mongoose.Schema(
  {
    /* --- --- --- Basic information --- --- --- */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    videoIntro: {
      url: { type: String },
      publicId: { type: String },
      type: { type: String },
    },

    subjects: [
      {
        type: String,
        required: true,
      },
    ],

    qualifications: [
      {
        degree: String,
        university: String,
        year: Number,
      },
    ],

    yearsOfExperience: {
      type: Number,
      default: 0,
    },

    certificates: [
      {
        image: {
          url: { type: String },
          publicId: { type: String },
          type: { type: String },

        },
        title: {
          type: String,
          trim: true,
        },
      }
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },



    /* --- --- --- earnings --- --- --- */

    payoutAccount: {
      stripeAccountId: { type: String }, // For Stripe Connect
      bankAccount: { type: String },
    },

    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingPayouts: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* --- --- --- statistics --- --- --- */
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

TeacherProfileSchema.index({ userId: 1 });
TeacherProfileSchema.index({ subjects: 1 });

export default mongoose.model("TeacherProfile", TeacherProfileSchema);
