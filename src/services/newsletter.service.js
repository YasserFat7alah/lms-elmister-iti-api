import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import Newsletter from "../models/Newsletter.js";
import AppError from "../utils/app.error.js";
import mailService from "./mail.service.js";

class NewsletterService {
    async subscribe(email) {
        // Check if valid email (basic check, though Model handles validation mostly)

        // Check for duplicate
        const existing = await NewsletterSubscriber.findOne({ email });
        if (existing) {
            throw AppError.badRequest("You are already subscribed to our newsletter.");
        }

        const subscriber = await NewsletterSubscriber.create({ email });

        // Optional: Send welcome email
        await mailService.sendEmail(
            email,
            "Welcome to our Newsletter!",
            "<h1>Thank you for subscribing!</h1><p>You will receive our latest news and updates.</p>"
        );

        return subscriber;
    }

    async getSubscribers() {
        return await NewsletterSubscriber.find().sort({ createdAt: -1 });
    }

    async unsubscribe(email) {
        const result = await NewsletterSubscriber.findOneAndDelete({ email });
        if (!result) {
            throw AppError.notFound("Subscriber not found");
        }
        return result;
    }

    async sendNewsletter(subject, message, recipientEmails = []) {
        let subscribers = [];

        if (recipientEmails.length > 0) {
            subscribers = recipientEmails.map(email => ({ email }));
        } else {
            subscribers = await NewsletterSubscriber.find();
        }

        if (subscribers.length === 0) {
            throw AppError.notFound("No recipients found for this newsletter.");
        }

        // Save history
        const newsletter = await Newsletter.create({
            subject,
            message,
            recipientsCount: subscribers.length,
            status: "Sent"
        });

        const promises = subscribers.map(sub =>
            mailService.sendEmail(sub.email, subject, message)
                .catch(err => console.error(`Failed to send to ${sub.email}:`, err))
        );

        await Promise.all(promises);

        return { sentCount: subscribers.length, newsletter };
    }

    async getAllNewsletters() {
        return await Newsletter.find().sort({ createdAt: -1 });
    }

    async deleteNewsletter(id) {
        const result = await Newsletter.findByIdAndDelete(id);
        if (!result) {
            throw AppError.notFound("Newsletter not found");
        }
        return result;
    }
}

export default new NewsletterService();
