import express from "express";
import ticketController from "../controllers/ticket.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
const { authenticate, authorize } = authMiddleware;

// Public: Create Ticket
router.post("/", ticketController.createTicket);

// Admin Only
router.use(authenticate, authorize("admin"));

router.get("/", ticketController.getAllTickets);
router.post("/:id/reply", ticketController.replyToTicket);
router.patch("/:id/status", ticketController.updateTicketStatus);
router.delete("/:id", ticketController.deleteTicket);

export default router;
