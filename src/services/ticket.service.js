import Ticket from "../models/Ticket.js";
import AppError from "../utils/app.error.js";
import mailService from "./mail.service.js";

class TicketService {
    async createTicket(data) {
        const ticket = await Ticket.create(data);
        return ticket;
    }

    async getAllTickets(filters = {}) {
        // Implement simple filtering if needed (e.g. status)
        const query = {};
        if (filters.status) {
            query.status = filters.status;
        }

        return await Ticket.find(query).sort({ createdAt: -1 });
    }

    async getTicketById(id) {
        const ticket = await Ticket.findById(id);
        if (!ticket) throw new AppError("Ticket not found", 404);
        return ticket;
    }

    async replyToTicket(id, message, sender = 'admin') {
        const ticket = await Ticket.findById(id);
        if (!ticket) throw new AppError("Ticket not found", 404);

        // Add reply
        ticket.replies.push({
            sender,
            message,
            repliedAt: new Date()
        });

        // Update status if admin replies
        if (sender === 'admin' && ticket.status === 'pending') {
            ticket.status = 'open'; // Or 'answered' / 'resolved' depending on flow. User said "answered or any alter state". Using 'open' or 'resolved' is standard. 
            // TicketsTable uses: open, pending, resolved.
            // Let's set to 'resolved' if it's a definitive answer, or 'open' if dialogue continues.
            // I'll set it to 'open' (active dialogue) or let admin choose status in update.
            // User said: "automatically turned into answered". "Resolved" is usually "Closed". 
            // Let's set it to "resolved" (since frontend table has Filter for Resolved).
            ticket.status = 'resolved';
        }

        await ticket.save();

        // Send email to ticket creator if admin replied
        if (sender === 'admin') {
            await mailService.sendEmail(
                ticket.email,
                `Re: ${ticket.subject || ticket.title || "Support Request"}`,
                `<p>Dear ${ticket.name},</p><p>${message}</p><p>Best regards,<br>Support Team</p>`
            );
        }

        return ticket;
    }

    async updateTicketStatus(id, status) {
        const ticket = await Ticket.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!ticket) throw new AppError("Ticket not found", 404);
        return ticket;
    }

    async deleteTicket(id) {
        const ticket = await Ticket.findByIdAndDelete(id);
        if (!ticket) throw new AppError("Ticket not found", 404);
        return ticket;
    }
}

export default new TicketService();
