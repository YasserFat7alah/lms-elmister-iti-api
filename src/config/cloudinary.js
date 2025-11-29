import cloudinary from "cloudinary";
import dotenv from "dotenv";
import { CLOUDINARY_URL } from "../utils/constants.js";

dotenv.config();

const url = new URL(CLOUDINARY_URL);

cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
});

export default cloudinary;
