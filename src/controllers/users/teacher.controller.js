import asyncHandler from "express-async-handler";
import teacherService from "../../services/users/teacher.service.js";
import AppError from "../../utils/app.error.js";

class TeacherController {

    constructor(service) {
        this.service = service;
    }

    getDashboard = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const dashboard = await this.service.getDashboard(req.user._id, startDate, endDate);

        res.status(200).json({
            success: true,
            data: dashboard
        });
    });

    getAcademicChart = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const data = await this.service.getAcademicChart(req.user._id, startDate, endDate);
        res.status(200).json({ success: true, data });
    });

    getEarningsChart = asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query;
        const data = await this.service.getEarningsChart(req.user._id, startDate, endDate);
        res.status(200).json({ success: true, data });
    });

    /** upload introduction Video 
     * @route PATCH /api/v1/teachers/me/video
     * @access Private Teacher
     * @returns {object} video intro details
     */
    uploadVideo = asyncHandler(async (req, res) => {
        if (!req.file) throw AppError.badRequest("Video file is required");

        const video = await this.service.uploadVideoIntro(req.user._id, req.file);

        res.status(200).json({
            success: true,
            message: "Video intro updated successfully",
            data: video
        });
    });

    /** Add a Certificate
     * @route POST /api/v1/teachers/me/certificates
     * @access Private Teacher
     * @returns {object} certificate details
     **/
    addCertificate = asyncHandler(async (req, res) => {
        if (!req.file) throw AppError.badRequest("Certificate image is required");

        const { title } = req.body;
        const certificates = await this.service.addCertificate(req.user._id, req.file, title);

        res.status(200).json({
            success: true,
            message: "Certificate added successfully",
            data: certificates
        });
    });

    /** delete a Certificate
     * @route DELETE /api/v1/teachers/me/certificates/:id
     * @access Private Teacher
     * @returns {object} certificate details
     **/
    deleteCertificate = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const certificates = await this.service.removeCertificate(req.user._id, id);

        res.status(200).json({
            success: true,
            message: "Certificate removed successfully",
            data: certificates
        });
    });
}

export default new TeacherController(teacherService);