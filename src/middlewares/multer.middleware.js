import multer from "multer";
import path from "path";
import fs from "fs";

// تأكد إن فولدر uploads موجود، ولو مش موجود نكريته
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

class MulterUploader {
    constructor() {
        // تغيير الاستراتيجية لـ DiskStorage
        this.storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, uploadDir)
            },
            filename: function (req, file, cb) {
                // تسمية الملف باسم فريد عشان التداخل
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
            }
        });

        this.fileFilter = (req, file, cb) => {
            const allowed = [
                "image/jpeg", "image/png", "image/webp",
                "video/mp4", "video/quicktime", "application/pdf",
            ];
            if (allowed.includes(file.mimetype)) cb(null, true);
            else cb(new Error("Invalid file type"), false);
        };

        this.upload = multer({ 
            storage: this.storage,
            limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (تأكد إنك غيرت دي)
            fileFilter: this.fileFilter  
        });
    }

    single(fieldName) { return this.upload.single(fieldName); }
    multiple(fieldName, max = 5) { return this.upload.array(fieldName, max); }
}

export default new MulterUploader();