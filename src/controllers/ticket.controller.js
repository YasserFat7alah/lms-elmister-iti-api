import asyncHandler from "express-async-handler";
import TicketService from "../services/ticket.service.js";

class TicketController {
    constructor(ticketService) {
        this.ticketService = ticketService;
    }

    createTicket = asyncHandler(async (req, res) => {
        const ticket = await this.ticketService.createTicket(req.body);
        res.status(201).json({
            success: true,
            data: { ticket },
            message: "Ticket created successfully"
        });
    });

    getAllTickets = asyncHandler(async (req, res) => {
        const tickets = await this.ticketService.getAllTickets(req.query);
        res.status(200).json({
            success: true,
            data: { tickets },
        });
    });

    replyToTicket = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { message } = req.body;

        // Assuming admin is sending, verify role middleware handles auth
        const ticket = await this.ticketService.replyToTicket(id, message, 'admin');

        res.status(200).json({
            success: true,
            data: { ticket },
            message: "Reply sent successfully"
        });
    });

    updateTicketStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        const ticket = await this.ticketService.updateTicketStatus(id, status);

        res.status(200).json({
            success: true,
            data: { ticket },
            message: "Ticket status updated"
        });
    });

    deleteTicket = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await this.ticketService.deleteTicket(id);
        res.status(200).json({
            success: true,
            message: "Ticket deleted successfully"
        });
    });
}

export default new TicketController(TicketService);
