import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 150,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        type: {
            type: String,
            enum: ["video", "document", "live", "offline"],
            default: "offline",
        },

        video: {
            url: { type: String },
            publicId: { type: String },
            type: { type: String }
        },

        document: [{
            url: { type: String },
            publicId: { type: String },
            resourceType: { type: String, default: "raw" }
        }],

        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
        },
        order: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft"
        }

    }, { timestamps: true });

LessonSchema.index({ groupId: 1, order: 1 }, { unique: true });


export default mongoose.model("Lesson", LessonSchema);
