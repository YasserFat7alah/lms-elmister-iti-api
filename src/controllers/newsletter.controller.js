import asyncHandler from "express-async-handler";
import NewsletterService from "../services/newsletter.service.js";

class NewsletterController {
    constructor(newsletterService) {
        this.newsletterService = newsletterService;
    }

    subscribe = asyncHandler(async (req, res) => {
        const { email } = req.body;
        const subscriber = await this.newsletterService.subscribe(email);
        res.status(201).json({
            success: true,
            data: { subscriber },
            message: "Subscribed successfully"
        });
    });

    getSubscribers = asyncHandler(async (req, res) => {
        const subscribers = await this.newsletterService.getSubscribers();
        res.status(200).json({
            success: true,
            data: { subscribers },
        });
    });

    getAllNewsletters = asyncHandler(async (req, res) => {
        const newsletters = await this.newsletterService.getAllNewsletters();
        res.status(200).json({
            success: true,
            data: { newsletters }
        });
    });

    unsubscribe = asyncHandler(async (req, res) => {
        const { email } = req.body;
        await this.newsletterService.unsubscribe(email);
        res.status(200).json({
            success: true,
            message: "Unsubscribed successfully"
        });
    })

    sendNewsletter = asyncHandler(async (req, res) => {
        const { subject, message, selectedEmails } = req.body;
        // selectedEmails is optional array

        const result = await this.newsletterService.sendNewsletter(subject, message, selectedEmails);

        res.status(200).json({
            success: true,
            message: "Newsletter sent successfully",
            data: result
        });
    });

    deleteNewsletter = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await this.newsletterService.deleteNewsletter(id);
        res.status(200).json({
            success: true,
            message: "Newsletter deleted successfully"
        });
    });
}

export default new NewsletterController(NewsletterService);
