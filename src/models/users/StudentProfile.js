import mongoose from "mongoose";
import { GRADE_LEVELS } from "../../utils/constants.js";

const StudentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },

  grade: {
    type: String,
    enum: GRADE_LEVELS,
    required: true,
  },

  notes: {
    type: String,
    trim: true,
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  approved: {
    type: Boolean,
    default: true, // For independent students, needs parent approval
  },

}, { timestamps: true });

StudentProfileSchema.index({ user: 1, parent: 1 }, { unique: true });

export default mongoose.model("StudentProfile", StudentProfileSchema);

