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

  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  /* --- --- --- STRIPE --- --- --- */
    customerId: {
      type: String,
    },

});

ParentProfileSchema.virtual("childrenCount").get(function () {
  return this.children.length;
});

export default mongoose.model("ParentProfile", ParentProfileSchema);
