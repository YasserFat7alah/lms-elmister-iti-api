import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema({

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },

    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
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
        }
    },

    type: {
        type: String,
        enum: ["video", "document", "live", "offline"],
        default: "offline",
    },

    video: {
        url:{type: String},
        publicId:{type: String}
    },
    
    document: {
        url:{type: String},
        publicId:{type: String}
    },
    //live??

    startTime: Date,
    endTime: Date,
    
}, { timestamps: true });

export default mongoose.model("Lesson", LessonSchema);
