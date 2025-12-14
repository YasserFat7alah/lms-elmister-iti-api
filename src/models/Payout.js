import mongoose from "mongoose";

const { Schema } = mongoose;

const PayoutSchema = new Schema(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "usd",
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending",
      index: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    teacherNote: {
      type: String,
      trim: true,
    },

    adminNote: {
      type: String,
      trim: true,
    },

    paidAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },

    transactionId: {
      type: String, // Stripe Transfer ID (tr_...)
    },

    transactionUrl: {
      type: String, // Link to Stripe Dashboard
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payout", PayoutSchema);


