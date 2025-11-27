import cloudinary from "../config/cloudinary.js";

class CloudinaryService {

  /** Convert Multer file buffer to Data URI
   * @param {Object} file - Multer file object
   */
  toDataUri(file) {
    const base64 = file.buffer.toString("base64");
    return `data:${file.mimetype};base64,${base64}`;
  }

  /** Upload ANY file (image, video, PDF, docs, audio)
   * @param {Object} file - Multer file object
   * @param {string} folder - Cloudinary folder
   * @param {Object} options - Additional Cloudinary options
   */
  async upload(file, folder = "uploads", options = {}) {
    if (!file) throw new Error("No file provided");

    const dataUri = this.toDataUri(file);

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "auto",  // auto-detect image, video, raw (PDF)
      ...options,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      type: result.resource_type
    };
  }

  /**
   * Delete Cloudinary file
   * @param {string} publicId - ID of the asset
   */
  async delete(publicId) {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
  }
}

export default new CloudinaryService();