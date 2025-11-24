import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true,
    },
    
    description: {
        type: String,
        trim: true,
    },

    thumbnail: {
        url: { type: String },
        publicId: { type: String },
    },
    //to be modified
    subject: {
        type: String,
        required: true,
        trim: true,
    },

    isPaid: {
        type: Boolean,
        default: false
    },
    
    price: {
        type: Number,
        required: function () {
            return this.isPaid
        },
    },

    duration: {
        type: Number,
    },

    gradeLevel: {
        enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        required: true
    },

    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    lessonsId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
        },
    ],

    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

}, { timestamps: true });

export default mongoose.model("Course", CourseSchema);
