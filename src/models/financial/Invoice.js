import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  /* --- --- --- STRIPE --- --- --- */
  stripeInvoiceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  stripeSubscriptionId: {
    type: String,
    required: true,
    index: true,
  },

  /* --- --- --- ACTORS --- --- --- */
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
    required: true,
  },

  /* --- --- --- AMOUNTS --- --- --- */

  amountPaid: {
    type: Number,
    required: true,
    min: 0,
  },

  amountDue: {
    type: Number,
    required: true,
    min: 0,
  },

  currency: {
    type: String,
    default: "usd",
    lowercase: true,
  },

  /* --- --- --- FEES --- --- --- */
  platformFee: {
    type: Number,
    required: true,
    min: 0,
  },

  teacherShare: {
    type: Number,
    required: true,
    min: 0,
  },

  /* --- --- --- STATUS --- --- --- */
  status: {
    type: String,
    enum: ["draft", "open", "paid", "void", "uncollectible"],
    default: "open",
  },

  paidAt: {
    type: Date,
  },

  periodStart: {
    type: Date,
  },

  periodEnd: {
    type: Date,
  },
}, { timestamps: true });

invoiceSchema.index({ teacher: 1, paidAt: -1 });
invoiceSchema.index({ enrollment: 1 });

export default mongoose.model("Invoice", invoiceSchema);