import express from "express";
import multerMiddleware from "../../middlewares/multer.middleware.js";
import cloudinaryController from "../../controllers/helpers/cloudinary.controller.js";


const router = express.Router();

/* --- --- --- CLOUDINARY ENDPOINTS --- --- --- */
// Upload
router.post("/upload-one", multerMiddleware.single("file"), cloudinaryController.uploadOne);
router.post("/upload-many", multerMiddleware.multiple("files"), cloudinaryController.uploadMany);

// Update
router.post("/update", multerMiddleware.single("file"), cloudinaryController.update);

// Delete
router.post("/delete-one", cloudinaryController.deleteOne);
router.post("/delete-many", cloudinaryController.deleteMany);

export { router as cloudinaryRouter };

