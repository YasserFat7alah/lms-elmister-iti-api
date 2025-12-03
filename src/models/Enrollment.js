import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },

    enrollmentDate: { 
        type: Date, 
        default: Date.now 
    },

    status: { 
        type: String, 
        enum: ['active', 'completed', 'cancelled'], 
        default: 'active' 
    }
});

// Add index for efficient queries
EnrollmentSchema.index({ student: 1, group: 1 }, { unique: true });
EnrollmentSchema.index({ group: 1 });
EnrollmentSchema.index({ student: 1 });

export default mongoose.model("Enrollment", EnrollmentSchema);