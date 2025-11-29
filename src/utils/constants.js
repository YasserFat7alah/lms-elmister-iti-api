import dotenv from 'dotenv';
dotenv.config();

/* --- --- --- ENVIRONMENT VARIABLES --- --- --- */
// ===> Base
export const ENVIRONMENT = process.env.NODE_ENV || 'development'; // 'development' | 'production' | 'test'
export const IS_PRODUCTION = ENVIRONMENT === 'production';

// ===> App
export const PORT = process.env.PORT || 4040;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms-elmister';

// ===> Security
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
export const JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
export const JWT_REFRESH_EXPIRE = +process.env.JWT_REFRESH_EXPIRE || 7 * 24 * 60 * 60 * 1000;

// ===> Third-Party Services
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

export const NODEMAILER_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};
export const FROM_EMAIL = process.env.FROM_EMAIL || `"Elmister" <${process.env.SMTP_USER}>`;

// ===> Client
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ===> Application Constants
export const GRADE_LEVELS = [
    "1","2","3","4","5","6","7","8",
    "9","10","11","12"
];

// ===> Cookie Settings
export const COOKIE_SETTINGS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'Lax',
    maxAge: JWT_REFRESH_EXPIRE,
};