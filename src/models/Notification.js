import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({

  recipientId: { 
    type: mongoose.Schema.Types.ObjectId,
     ref: "User",
      required: true 
    },

  type: { 
    type: String,
     enum: ["lesson", "assignment", "approval", "material"], 
    },

  message: {
    type: String,
    trim: true,
  },

  isRead: { 
    type: Boolean,
     default: false,
     },
     
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);