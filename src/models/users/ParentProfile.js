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

    payment: [{
        type: String,
        trim: true,
    }],

});

export default mongoose.model("ParentProfile", ParentProfileSchema);
