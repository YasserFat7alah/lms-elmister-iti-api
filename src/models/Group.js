import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
        minlength: 5,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
    },
    type: {
        type: String,
        enum: ["online", "offline", "hybrid"],
        required: true,
    },
    
    startingDate: {
        type: Date,
        required: true,
    },
    startingTime: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    schedule: [{
        day: {
            type: String,
            enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
            required: true,
        },
        time: {
            type: String,
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,  // 00:00  23:59
            required: true,
        }
    }],
    capacity: {
        type: Number,
        required: true,
        min: 0,
    },
    studentsCount: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: function (value) {
                return value <= this.capacity;
            },
            message: 'Students count cannot exceed capacity'
        }
    },
    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open",
    },
    
    location: {
        type: String,
        required: function () {
            return this.type !== "online";
        }
    },
    link: {
        type: String,
        required: function () {
            return this.type === "online";
        }
    },
    
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],

    /* --- --- --- STRIPE --- --- --- */
    isFree: {
        type: Boolean,
        default: false,
    },

    price: {
        type: Number,
        default: 0,
        min: 0,
        required: function () {
            return !this.isFree;
        },
    },

    currency: {
        type: String,
        default: "usd",
        lowerCase: true,
        minlength: 3,
        maxlength: 3,
    },

    stripe: {
        productId:{
            type: String,
        },

        priceId: {
            type: String,
        },

        price: {
            type: Number,
        },

        billingInterval: {
        type: String,
        enum: ["month"],
        default: "month",
        },
    }
    
}, { timestamps: true });

//....................VIRTUAL FIELDS.....................
GroupSchema.virtual('availableSeats').get(function () {
    return this.capacity - this.studentsCount;
});

//....................PRE HOOKS.....................
GroupSchema.pre("save", function (next) {
    // sync studentsCount
    this.studentsCount = this.students.length;
    
    //sync status with capacity
    if (this.studentsCount >= this.capacity) {
        this.status = "closed";
    } else {
        this.status = "open";
    }

    //if  free >> price = 0
    if (this.isFree) {
        this.price = 0;
    }

    next();
});

//....................INDEXES.....................
GroupSchema.index({ courseId: 1 });
GroupSchema.index({ teacherId: 1 });
GroupSchema.index({ status: 1 });
GroupSchema.index({ "schedule.day": 1 });

export default mongoose.model("Group", GroupSchema);