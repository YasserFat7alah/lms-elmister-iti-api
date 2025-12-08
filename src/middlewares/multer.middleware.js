import multer from "multer";

export class MulterUploader {
    constructor() {
        this.storage = multer.memoryStorage();
        this.fileFilter = (req, file, cb) => {
            const allowed = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                "image/gif",
                "image/svg+xml",
                "image/tiff",
                "video/mp4",
                "video/mov",
                "video/avi",
                "video/wmv",
                "video/flv",
                "video/quicktime",
                "application/pdf", //.pdf
                "application/msword", //.doc
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", //.docx
                "application/vnd.ms-powerpoint", //.ppt
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", //.pptx
                "text/plain" //.txt

            ];

            if (allowed.includes(file.mimetype)) cb(null, true);
            else cb(new Error("Invalid file type"), false);
        };

        this.upload = multer({
            storage: this.storage,
            limits: { fileSize: 150 * 1024 * 1024 }, // 5MB limit

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

    fields(fieldsArray) {
        return this.upload.fields(fieldsArray);
    }
}

export default new MulterUploader();