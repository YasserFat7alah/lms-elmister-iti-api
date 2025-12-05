import mongoose from "mongoose";

const ParentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  address: {
    type: String,
    trim: true,
  },

  /* --- --- --- STRIPE --- --- --- */
  stripe: {
    customerId: {
      type: String,
    },

    defaultPaymentMethodId: {
      type: String,
    },

    payment: [
      {
        type: String,
      },
    ],
  },
});

export default mongoose.model("ParentProfile", ParentProfileSchema);
