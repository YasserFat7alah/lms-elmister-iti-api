import joi from "joi";

/* --- --- --- REGISTRATION & LOGIN --- --- --- */

export const registerSchema = joi.object({
    name: joi.string().trim().min(2).max(80).required().messages({
        'any.required': 'Name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 80 characters'
    }),
    email: joi.string().email().trim().lowercase().required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    password: joi.string().min(8).max(56).required().messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 56 characters'
    }),
    age: joi.number().integer().min(5).max(80).required().messages({
        'number.base': 'Age must be a number',
        'any.required': 'Age is required',
        'number.min': 'Age must be at least 5 years old',
        'number.max': 'Age must be less than 80 years old'
    }),
    role: joi.string().valid('teacher', 'parent', 'student', 'admin').default('parent').messages({
        'any.only': 'Role must be one of: teacher, parent, student, admin'
    }),
    gradeLevel: joi.string().valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12').optional().messages({
        'any.only': 'Grade level must be between 1 and 12'
    }),
    phone: joi.string().trim().pattern(/^[0-9+\-\s()]+$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number'
    }),
    specialization: joi.string().trim().max(200).optional().messages({
        'string.max': 'Specialization must not exceed 200 characters'
    }),
    parentId: joi.string().hex().length(24).optional().messages({
        'string.hex': 'Parent ID must be a valid MongoDB ObjectId',
        'string.length': 'Parent ID must be a valid MongoDB ObjectId'
    })
});

export const loginSchema = joi.object({
    email: joi.string().email().trim().lowercase().required().messages({
        'string.empty': 'Email is required',
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    password: joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

/* --- --- --- PASSWORD MANAGEMENT --- --- --- */

export const changePasswordSchema = joi.object({
    currentPassword: joi.string().required().messages({
        'any.required': 'Current password is required'
    }),

    newPassword: joi.string().min(8).max(128).required().messages({
        'any.required': 'New password is required',
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password must not exceed 128 characters'
    })
});

export const forgotPasswordSchema = joi.object({
    email: joi.string().email().trim().lowercase().required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address'
    })
});

export const resetPasswordSchema = joi.object({
    email: joi.string().email().trim().lowercase().required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    otp: joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
        'any.required': 'OTP is required',
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
    }),
    newPassword: joi.string().min(8).max(128).required().messages({
        'any.required': 'New password is required',
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password must not exceed 128 characters'
    })
});

/* --- --- --- EMAIL VERIFICATION --- --- --- */

export const verifyEmailSchema = joi.object({
    token: joi.string().required().messages({
        'any.required': 'Verification token is required'
    })
});

export const resendVerificationSchema = joi.object({
    email: joi.string().email().trim().lowercase().required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address'
    })
});

/* --- --- --- OAUTH PROVIDER LINKING --- --- --- */

export const linkProviderSchema = joi.object({
    provider: joi.string().valid('google', 'facebook').required().messages({
        'any.required': 'Provider is required',
        'any.only': 'Provider must be either google or facebook'
    }),
    providerId: joi.string().required().messages({
        'any.required': 'Provider ID is required'
    })
});

export const unlinkProviderSchema = joi.object({
    provider: joi.string().valid('google', 'facebook').required().messages({
        'any.required': 'Provider is required',
        'any.only': 'Provider must be either google or facebook'
    })
});

/* --- --- --- PROFILE COMPLETION --- --- --- */

export const completeProfileSchema = joi.object({
    name: joi.string().trim().min(2).max(100).optional().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 100 characters'
    }),
    phone: joi.string().trim().pattern(/^[0-9+\-\s()]+$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number'
    }),
    role: joi.string().valid('teacher', 'parent', 'student', 'admin').optional().messages({
        'any.only': 'Role must be one of: teacher, parent, student, admin'
    }),
    gradeLevel: joi.string().valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12').optional().messages({
        'any.only': 'Grade level must be between 1 and 12'
    }),
    specialization: joi.string().trim().max(200).optional().messages({
        'string.max': 'Specialization must not exceed 200 characters'
    }),
    age: joi.number().integer().min(5).max(80).optional().messages({
        'number.base': 'Age must be a number',
        'number.min': 'Age must be at least 5 years old',
        'number.max': 'Age must be less than 80 years old'
    }),
    parentId: joi.string().hex().length(24).optional().messages({
        'string.hex': 'Parent ID must be a valid MongoDB ObjectId',
        'string.length': 'Parent ID must be a valid MongoDB ObjectId'
    })
});