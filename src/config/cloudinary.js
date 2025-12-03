import {v2 as cloudinary} from "cloudinary";
import { CLOUDINARY_URL } from "../utils/constants.js";

const url = new URL(CLOUDINARY_URL);

cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password,
});

export default cloudinary;
