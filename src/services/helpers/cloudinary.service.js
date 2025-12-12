import cloudinary from "../../config/cloudinary.js";
import fs from "fs";
import AppError from "../../utils/app.error.js";
import streamifier from 'streamifier';
import { log } from "console";

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
   * @returns {Promise<Object>} - Uploaded file object
   */
  async upload(file, folder = "uploads", options = {}) {
    if (!file || !file.buffer) throw AppError.badRequest("No file provided");

    const buffer = file.buffer;

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream({
        folder,
        resource_type: "auto",
        ...options,
      },
        (error, result) => {
          if (error) throw AppError.badRequest(error.message);
          if (!result) throw AppError.badRequest("Cloudinary returned empty result");

          resolve({
            url: result.secure_url || result.url,
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
  async delete(publicId, resourceType = "auto") {
    return this.cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

  /** Update Cloudinary file
   * @param {Object} file - Multer file object
   * @param {string} publicId - ID of the asset
   * @returns {Promise<Object>} - Updated file object
   */
  async update(file, publicId, resourceType = "auto") {
    if (!file || !file.buffer) throw AppError.badRequest("No file provided");
    if (!publicId) throw AppError.badRequest("Public ID is required");

    const updated = await this.upload(file, "", {
      public_id: publicId,
      overwrite: true,
      resource_type: resourceType
    });

    return updated;
  }

  /** Upload multiple files
   * @param {Array} files - Array of Multer file objects
   * @param {string} folder - Cloudinary folder
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Array>} - Array of uploaded file objects
   */
  async uploadMany(files, folder = "uploads", options = {}) {
    if (!files || !Array.isArray(files) || files.length === 0)
      throw AppError.badRequest("No files provided");

    const uploads = files.map(file => this.upload(file, folder, options));
    return Promise.all(uploads);
  }

  /** Delete multiple Cloudinary files
   * @param {Array} publicIds - IDs of the assets
   * @param {string} resourceType - Type of the asset
   * @returns {Promise<Array>} - Array of deleted file objects
   */
  async deleteMany(publicIds, resourceType = "auto") {
    if (!publicIds.length || !Array.isArray(publicIds)) throw AppError.badRequest("No publicIds provided");

    const deletes = publicIds.map(publicId => this.delete(publicId, resourceType));
    const deleted = await Promise.all(deletes);

    return deleted;
  }

  /** Convert Multer file (memory or disk) to Data URI
  * @param {Object} file - Multer file object
  * @returns {string} - Data URI
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