import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        subject: {
            // Changed from 'title' to 'subject' to match typical ticket structure, but UI uses 'title' in one view and 'subject' in another. 
            // The user prompt said: "Contact form... subject" (implied). UI TicketsTable uses `title`.
            // I will use `title` to map better to the frontend table I saw earlier (TicketsTable.jsx calls it 'title').
            // Wait, Contact form calls it 'message'? No, ContactSection.jsx doesn't have a subject field, just name, email, phone, message.
            // But TicketsTable shows "Title". I'll default to using `subject` but map it carefully or just add `subject` to contact form later.
            // Actually, looking at TicketsTable.jsx: `ticket.title`.
            // Let's stick to `subject` in DB and I'll map it, or use `title` to be consistent with frontend viewing.
            // I'll use `subject` as it is more standard for tickets and map `title` to it or vice versa. 
            // User prompt: "admin create a new newsletter... subject... title..."
            // For Ticket: "anyone can send a ticket...".
            // Let's use `subject` and I will ensure the frontend sends `subject` (or I'll add it to the contact form).
            type: String,
            required: false, // Make optional if contact form doesn't have it yet
            default: "New Ticket"
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "open", "resolved", "closed"],
            default: "pending",
        },
        replies: [
            {
                sender: { type: String, enum: ['user', 'admin'], default: 'admin' },
                message: String,
                repliedAt: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true,
    }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
