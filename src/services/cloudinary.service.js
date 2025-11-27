import cloudinary from "../config/cloudinary.js";

class CloudinaryService {

    /** Uploads a buffer to Cloudinary
     * @param {Buffer} buffer - The buffer to upload
     * @param {string} folder - The folder in Cloudinary to upload to
     * @param {Object} options - Additional upload options
     * @returns {Promise} - Resolves with the upload result
     */
     async upload(img, folder = "uploads", options = {}) {
        const res = await cloudinary.uploader.upload(img, {
            folder,
            ...options,
    resource_type: "auto",
  });
        return res;
    }

    /** Deletes a file from Cloudinary
     * @param {string} publicId - The public ID of the file to delete
     * @returns {Promise} - Resolves with the deletion result
     */
    async delete(publicId) {
        return await cloudinary.uploader.destroy(publicId);
    }

    toDataUri(file) {
        const base64 = file.buffer.toString('base64');
        return `data:${file.mimetype};base64,${base64}`;
    }

}

export default new CloudinaryService();