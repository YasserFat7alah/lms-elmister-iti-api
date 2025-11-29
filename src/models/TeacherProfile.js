import mongoose from "mongoose";

const TeacherProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  bio: {
    type: String,
    trim: true,
    maxlength: 2000,
  },

  specialization: [{
    type: String,
    trim: true,
  }],

  payoutAccount: {
    stripeAccountId: { type: String }, // For Stripe Connect
    bankAccount: { type: String },
  },

  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },

  pendingPayouts: {
    type: Number,
    default: 0,
    min: 0,
  },

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
}, { timestamps: true });

TeacherProfileSchema.index({ userId: 1 });
TeacherProfileSchema.index({ subjects: 1 });

export default mongoose.model("TeacherProfile", TeacherProfileSchema);