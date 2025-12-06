import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["NEW_USER", "NEW_TESTIMONIAL", "NEW_PAYMENT", "SYSTEM", "ALERT", "New_Enrollment"],
    default: "SYSTEM"
  },

  receiverRole: {
    type: String,
    enum: ["admin", "teacher", "student","parent",'user'],
    default: "admin"
  },
  // link to resource (userId, testimonialId, etc)
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  // link to collection (User, Testimonial,...etc)
  refCollection: {
    type: String,
    default: null
  },

  // who triggered the notification
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // admin targeted (true = shown to admin dashboard)
  targetAdmin: {
    type: Boolean,
    default: true
  },

  isRead: {
    type: Boolean,
    default: false
  },

  priority: {
    type: String,
    enum: ["low", "normal", "high"],
    default: "normal"
  }
}, { timestamps: true });

// .....................indexes..........................
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
