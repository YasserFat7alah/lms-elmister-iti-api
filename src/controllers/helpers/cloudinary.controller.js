import cloudinaryService from "../../services/helpers/cloudinary.service.js";
import asyncHandler from "express-async-handler";
import AppError from "../../utils/app.error.js";


class CloudinaryController {
    constructor(service) {
        this.service = service;
    }

    uploadOne = asyncHandler(async (req, res) => {
        const file = req.file;
        const { path, type } = req.body;
        if (!file) throw AppError.badRequest('File is required');

        if (!file.mimetype.startsWith(type)) throw AppError.badRequest('File type does not match');

        const uploaded = await this.service.upload(file, path, { resource_type: type });
        if (!uploaded) throw AppError.badRequest('File upload failed');

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            file: uploaded,
        });
    });

    uploadMany = asyncHandler(async (req, res) => {
        const files = req.files;
        const { path, type } = req.body;
        if (!files) throw AppError.badRequest('Files are required');

        const uploaded = await this.service.uploadMany(files, path, { resource_type: type });
        if (!uploaded) throw AppError.badRequest('Files upload failed');

        res.status(200).json({
            success: true,
            message: 'Files uploaded successfully',
            files: uploaded,
        });
    });

    update = asyncHandler(async (req, res) => {
        const file = req.file;
        const { publicId, type } = req.body;

        if (!file) throw AppError.badRequest('File is required');
        const pid = String(publicId).trim();
        if (!pid) throw AppError.badRequest('Public ID is required');

        const updated = await this.service.update(file, pid, type);

        if (!updated) throw AppError.badRequest('File update failed');

        res.status(200).json({
            success: true,
            message: 'File updated successfully',
            file: updated,
        });
    });

    deleteOne = asyncHandler(async (req, res) => {
        const { publicId, type } = req.body;
        const pid = String(publicId).trim();
        if (!pid) throw AppError.badRequest('Public ID is required');

        await this.service.delete(pid, type);
        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
        });
    });

    deleteMany = asyncHandler(async (req, res) => {
        const { publicIds, type } = req.body;

        if (!Array.isArray(publicIds)) throw AppError.badRequest('Public IDs are required');

        await this.service.deleteMany(publicIds, type);

        res.status(200).json({
            success: true,
            message: 'Files deleted successfully',
        });
    });
}

export default new CloudinaryController(cloudinaryService);
