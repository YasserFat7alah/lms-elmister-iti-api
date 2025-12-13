import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        recipientsCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["Sent", "Draft", "Failed"],
            default: "Sent"
        },
        sentAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
    }
);

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;
