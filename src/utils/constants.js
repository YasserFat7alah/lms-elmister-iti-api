import dotenv from 'dotenv';
dotenv.config();

/* --- --- --- ENVIRONMENT VARIABLES --- --- --- */
// ===> Base
export const ENVIRONMENT = process.env.NODE_ENV || 'development'; // 'development' | 'production' | 'test'

// ===> App
export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;

// ===> Security
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
export const JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

// ===> Third-Party Services
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

// ===> Client
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ===> Application Constants
export const GRADE_LEVELS = [
    "1","2","3","4","5","6","7","8",
    "9","10","11","12"
];

