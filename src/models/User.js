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
        unique: true,
        toLowerCase: true
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

    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  
    }
    ],

    emailVerified: {
        type: Boolean,
        default: false
    },

    otp: {
        type: String,
        select: false,
        default: null
    },

    otpExpiry: {
        type: Number,
        default: 0,
        select: false
    },

}, { timestamps: true });

userSchema.pre('save', async function () {
    console.log(this.password , "   before");
    
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await this.hashPassword(this.password);
    }

    console.log(this.password , "   after");

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

userSchema.methods.hashPassword = async function (password) {
    return await bcrypt.hash(password, 12);
}; 


export default mongoose.model('User', userSchema);
