import TeacherProfile from "../../models/users/TeacherProfile.js";
import BaseService from "../base.service.js";
import cloudinaryService from "../helpers/cloudinary.service.js";
import AppError from "../../utils/app.error.js";

class TeacherService extends BaseService {
    constructor(model) {
        super(model);
    }

    /** Upload or update teacher video intro
     * @param {string} userId - The ID of the user
     * @param {object} videoFile - The video file to upload
     * @returns {object} The uploaded video intro details
     */
    async uploadVideoIntro(userId, videoFile) {

        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        const uploadResult = await cloudinaryService.upload(videoFile, "teachers/videos", { resource_type: "video" });

        if (profile.videoIntro?.publicId && uploadResult.publicId) {
            await cloudinaryService.delete(profile.videoIntro.publicId, 'video');
        }

        profile.videoIntro = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            type: uploadResult.type
        };
        await profile.save();

        return profile.videoIntro;
    }

    /** Add a Certificate
     * @param {string} userId - The ID of the user
     * @param {object} file - The certificate file to upload
     * @returns {object} The uploaded certificate details
     * */
    async addCertificate(userId, file, title = "New Certificate") {
        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        // Upload Certificate Image
        const uploadResult = await cloudinaryService.upload(file, "elmister/teachers/certificates", { resource_type: "image" });

        const newCert = {
            title,
            image: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: uploadResult.type
            }
        };

        // Push to array
        profile.certificates.push(newCert);
        await profile.save();

        return profile.certificates;
    }

    /** Remove a Certificate
     * @param {string} userId - The ID of the user
     * @param {string} certificateId - The ID of the certificate
     */
    async removeCertificate(userId, certificateId) {
        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        // Find the cert to delete from Cloudinary
        const cert = profile.certificates.id(certificateId);
        if (!cert) throw AppError.notFound("Certificate not found");

        if (cert.image?.publicId) {
            await cloudinaryService.delete(cert.image.publicId);
        }

        // Pull from array using Mongoose .pull()
        profile.certificates.pull(certificateId);
        await profile.save();

        return profile.certificates;
    }
}

export default new TeacherService(TeacherProfile);