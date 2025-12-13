import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        subscribedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const NewsletterSubscriber = mongoose.model(
    "NewsletterSubscriber",
    newsletterSubscriberSchema
);

export default NewsletterSubscriber;
