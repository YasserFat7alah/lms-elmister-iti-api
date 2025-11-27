import multer from "multer";

class MulterUploader {
    constructor() {
        this.storage = multer.memoryStorage();
        this.fileFilter = (req, file, cb) => {
            const allowed = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "video/mp4",
                "video/quicktime",
                "application/pdf",
            ];

        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Invalid file type"), false);
        };

        this.upload = multer({ 
            storage: this.storage   ,
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit

            fileFilter: this.fileFilter  
        });
    }

    /**
     * Upload a single file
     * @param {string} fieldName - The name of the form field for the file
     * @returns {middleware} - Multer middleware to handle single file upload
     */
    single(fieldName) {
        return this.upload.single(fieldName);
    }

    /**
     * Upload multiple files
     * @param {string} fieldName - The name of the form field for the files
     * @param {number} max - The maximum number of files to upload
     * @returns {middleware} - Multer middleware to handle multiple file uploads
     */
    multiple(fieldName, max = 5) {
        return this.upload.array(fieldName, max);
    }
}

const multerMiddleware = new MulterUploader();
export default multerMiddleware;