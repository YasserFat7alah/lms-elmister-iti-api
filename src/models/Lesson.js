import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3, 
            maxlength: 150,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        date: {
            type: Date, 
        },
        startTime: {
            type: String,
        },
        endTime: {
            type: String, 
        },

        type: {
            type: String,
            enum: ["video", "document", "online", "offline"], 
            default: "offline",
        },

        meetingLink: {
            type: String, 
            trim: true
        },
        location: {
            type: String, 
            trim: true
        },

        attendance: [
            {
                studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                status: {
                    type: String,
                    enum: ["present", "absent", "late", "excused"], 
                    default: "absent",
                },
            }
        ],

        video: {
            url: { type: String },
            publicId: { type: String },
            type: { type: String }
        },

        document: [{
            url: { type: String },
            publicId: { type: String },
            type: { type: String, default: "raw" }
        }],

        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
        },
        
        order: {
            type: Number,
            min: 0,
        },

        status: {
            type: String,
            enum: ["draft", "published", "archived", "completed", "cancelled"],
            default: "published" 
        },
        materials: [
        {
            title: { type: String, required: true }, 
            url: { type: String, required: true },   
            type: { 
                type: String, 
                enum: ['pdf', 'video', 'link', 'image'], 
                default: 'link' 
            }
        }
    ],


    }, { timestamps: true });

LessonSchema.index({ groupId: 1, order: 1 }, { unique: true });

export default mongoose.model("Lesson", LessonSchema);