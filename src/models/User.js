import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    username: {
        type: String,
        trim: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 8,
        select: false
    },

    avatar: {
        url: { type: String },
        publicId: { type: String },
        type: { type: String }
    },

    phone: {
        type: String,
        trim: true
    },

    role: {
        type: String,
        enum: ["admin", "teacher", "parent", "student"],
        required: true
    },

    childrenId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  
    }
    ]

}, { timestamps: true });

userSchema.pre('save', async function () {
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }

    // Generate username
    if (!this.username) {
        const namePart = this.name.replace(/\s+/g, '').toLowerCase();
        const timestamp = Date.now();
        const shortTimestamp = timestamp.toString().slice(-4);
        this.username = `${namePart}${shortTimestamp}`;
    }

});


// Compare password
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);