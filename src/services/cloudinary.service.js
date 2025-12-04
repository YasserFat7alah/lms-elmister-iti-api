import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import AppError from "../utils/app.error.js";
import streamifier from 'streamifier';

/** Cloudinary service
 * @class CloudinaryService
 * @description Handles Cloudinary uploads and deletions
 * @constructor Cloudinary Instance
 */ 
export class CloudinaryService {
  
  constructor(cloudinaryInstance) {
    this.cloudinary = cloudinaryInstance;
  }

  /** Upload ANY file (image, video, PDF, docs, audio)
   * @param {Object} file - Multer file object
   * @param {string} folder - Cloudinary folder
   * @param {Object} options - Additional Cloudinary options
   */
  async upload(file, folder = "uploads", options = {}) {  
    if (!file || !file.buffer) throw AppError.badRequest("No file provided");

    const buffer = file.buffer;

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream({
        folder,
        resource_type: "auto", 
        ...options,},
        (error, result) => {
        if (error) reject(error);
        if(!result) reject(new Error("Cloudinary returned empty result"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          type: result.resource_type
        });
      });

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /** Delete Cloudinary file
   * @param {string} publicId - ID of the asset
   */
  async delete(publicId,resourceType = "auto") {
    return this.cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

   /** Convert Multer file (memory or disk) to Data URI
   * @param {Object} file - Multer file object
   */
  toDataUri(file) {
    // Support both memoryStorage (buffer) and diskStorage (path)
    let buffer;

    if (file.buffer) { // MemoryStorage
      buffer = file.buffer;
    } else if (file.path) { // DiskStorage
      buffer = fs.readFileSync(file.path);
    } else {
      throw new Error("File has neither buffer nor path");
    }

    const base64 = buffer.toString("base64");
    return `data:${file.mimetype};base64,${base64}`;
  }
}

export default new CloudinaryService(cloudinary);