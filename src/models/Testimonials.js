import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },

    message: {
        type: String,
        required: true,
        minlength: 10
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
//Admin Approval
    isApproved: {
        type: Boolean,
        default: false
    },
//Puplish it
    isFeatured: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
);

testimonialSchema.index({ user: 1, createdAt: 1 });

export default mongoose.model("Testimonial", testimonialSchema);
