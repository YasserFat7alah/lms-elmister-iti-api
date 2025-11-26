import cloudinary from "cloudinary";

cloudinary.config({
    url: process.env.CLOUDINARY_URL,
});

export default cloudinary;
