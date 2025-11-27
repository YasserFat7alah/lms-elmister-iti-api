import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const url = new URL(process.env.CLOUDINARY_URL);

cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
});

console.log("Cloudinary current config:", cloudinary.config());

export default cloudinary;
