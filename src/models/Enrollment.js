import mongoose from "mongoose";

const { Schema } = mongoose;

const ChargeSchema = new Schema(
  {
    invoiceId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    teacherShare: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EnrollmentSchema = new Schema(
  {
    /* --- --- --- ACTORS --- --- --- */
    parent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* --- --- --- COURSE --- --- --- */
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    /* --- --- --- STRIPE --- --- --- */
    customerId: {
      type: String,
      required: true,
    },

    subscriptionId: {
      type: String,
      unique: true,
    },

    checkoutSessionId: {
      type: String,
    },

    priceId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
      default: "active",
    },

    currentPeriodStart: {
      type: Date,
    },

    currentPeriodEnd: {
      type: Date,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    paidAt: { type: Date },

    canceledAt: { type: Date },

    charges: [ChargeSchema],
  },
  { timestamps: true }
);

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ student: 1, course: 1, status: 1 });
EnrollmentSchema.index({ subscriptionId: 1 });

export default mongoose.model("Enrollment", EnrollmentSchema);
