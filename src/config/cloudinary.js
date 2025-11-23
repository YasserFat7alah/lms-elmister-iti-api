import cloudinary from "cloudinary";
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    url: process.env.CLOUDINARY_URL,
});

export default cloudinary