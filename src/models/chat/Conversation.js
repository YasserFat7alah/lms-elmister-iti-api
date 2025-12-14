import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
    {
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        }
    },
    { timestamps: true }
);
// Create a unique index (participants Key) >> only 1 conversation between 2 users
ConversationSchema.add({ participantsKey: { type: String, required: true } });
ConversationSchema.index({ participantsKey: 1 }, { unique: true });

export default mongoose.model("Conversation", ConversationSchema);
