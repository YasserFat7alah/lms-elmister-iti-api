import multer from "multer";

class MulterUploader {
    constructor() {
        this.storage = multer.memoryStorage();

        this.upload = multer({ 
            storage: this.storage   ,
            limits: { fileSize: 1000000*5 }, // 5MB limit

            fileFilter: function (req, file, cb) {
                if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
                    cb(null, true);
                } else {
                    cb(new Error('Only .jpeg and .png files are allowed!'), false);
                }}   
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

export default new MulterUploader();