import mongoose from "mongoose";
import { GRADE_LEVELS } from "../utils/constants.js";

const StudentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
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

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  approved: {
    type: Boolean,
    default: true, // For independent students, needs parent approval
  },

}, { timestamps: true });

StudentProfileSchema.index({ userId: 1 });
StudentProfileSchema.index({ parentId: 1 });

export default mongoose.model("StudentProfile", StudentProfileSchema);

