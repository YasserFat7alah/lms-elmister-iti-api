import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
    },

    age: {
      type: Number,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    avatar: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    role: {
      type: String,
      enum: ["admin", "teacher", "parent", "student"],
      required: true,
    },

    // Teacher Specific
    specialization: {
      type: String,
      required: function () {
        return this.role === "teacher";
      },
    },

    // Student Specific Data
    gradeLevel: {
      enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      required: function () {
        return this.role === "student";
      },
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "student";
      },
    },

    // Parent Specific data
    childrenId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if(!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("User", userSchema);
