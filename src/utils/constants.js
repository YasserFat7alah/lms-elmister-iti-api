import dotenv from 'dotenv';
dotenv.config();

/* --- --- --- ENVIRONMENT VARIABLES --- --- --- */
// ===> Base
export const ENVIRONMENT = process.env.NODE_ENV || 'development'; // 'development' | 'production' | 'test'
export const IS_PRODUCTION = ENVIRONMENT === 'production';

// ===> App
export const PORT = process.env.PORT || 4040;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-elmister';
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ===> Security
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
export const JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';

export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key';
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d'

// ===> OAuth
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// ===> Third-Party Services
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

// ===> Nodemailer Configuration
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
const IS_GMAIL = (process.env.SMTP_SERVICE || 'gmail').toLowerCase() === 'gmail';
export const NODEMAILER_CONFIG = {
    ...(IS_GMAIL ? {
        service: 'gmail'
    }
        : {
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
            secure: process.env.SMTP_PORT == 465,
        }
    ),
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
};

export const SENDER_EMAIL = process.env.SENDER_EMAIL || SMTP_USER || '';

// ===> Application Constants
export const GRADE_LEVELS = [
    "1", "2", "3", "4", "5", "6", "7", "8",
    "9", "10", "11", "12"
];

// ===> Cookie Settings
export const REFRESH_COOKIE_SETTINGS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const ACCESS_COOKIE_SETTINGS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
};