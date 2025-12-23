// Quick test script to check notifications in database
// Run this in MongoDB shell or create a test endpoint

// Check recent notifications
db.notifications.find().sort({ createdAt: -1 }).limit(10).pretty()

// Check notifications by type
db.notifications.find({ type: "ENROLLMENT" }).sort({ createdAt: -1 }).limit(5).pretty()

// Check notifications for specific user (replace USER_ID)
db.notifications.find({ receiver: ObjectId("USER_ID") }).sort({ createdAt: -1 }).pretty()

// Check admin notifications
db.notifications.find({ receiverRole: "admin" }).sort({ createdAt: -1 }).pretty()
