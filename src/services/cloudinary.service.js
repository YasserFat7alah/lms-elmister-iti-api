import cloudinary from "../config/cloudinary.js";

class CloudinaryService {

    /** Uploads a buffer to Cloudinary
     * @param {Buffer} buffer - The buffer to upload
     * @param {string} folder - The folder in Cloudinary to upload to
     * @param {Object} options - Additional upload options
     * @returns {Promise} - Resolves with the upload result
     */
     uploadBuffer(buffer, folder = "uploads", options = {}) {
        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder,
                    transformation: options.transformation || [],
                    quality: options.quality || "auto",
                    fetch_format: options.format || "auto",
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            upload.end(buffer);
        });
    }

    /** Deletes a file from Cloudinary
     * @param {string} publicId - The public ID of the file to delete
     * @returns {Promise} - Resolves with the deletion result
     */
    async delete(publicId) {
        return await cloudinary.uploader.destroy(publicId);
    }

}

export default new CloudinaryService();