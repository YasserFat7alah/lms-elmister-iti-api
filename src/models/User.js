import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
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
        type: String,
        required: true,
        trim: true,
        minlength: 8,
        select: false
    },
    age: {
        type: Number,
        required: true
    },

    gradeLevel: {
        enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        required: true
    },

    phone: {
        type: String,
        trim: true
    },
    avatar: {
        url: { type: String },
        publicId: { type: String }
    },

    role: {
        type: String,
        enum: ["admin", "teacher", "parent", "student"],
        required: true
    },
    specialization: {
        type: String,
        required: function () {
            return this.role === "teacher";
        },
        default: null
    },

    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
            return this.role === "student";
        },
    },

    childrenId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
            return this.role === "parent";
        },
    }
    ]

}, { timestamps: true });

// Hash password 
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);