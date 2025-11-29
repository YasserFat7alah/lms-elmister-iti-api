import Course from "../models/Course.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./cloudinary.service.js";
import AppError from "../utils/app.error.js";

class CourseService extends BaseService {

    constructor(Course) {
        super(Course);
    }

    /** Creates a new course with optional thumbnail upload.
     * @param {Object} data - The course data.
     * @param {Object} thumbnailFile - The thumbnail file to upload.
     * @returns {Object} The newly created course.
     */
    async create(data, thumbnailFile) {
        let thumbnail = null;
        
        if (thumbnailFile) { // If there's a thumbnail to upload
            const uploadResult = await cloudinaryService.upload(thumbnailFile, "courses/thumbnails/");

            thumbnail = {
                url: uploadResult.url,
                publicId: uploadResult.publicId
            };
        }
        const newCourse = await super.create({...data, thumbnail});
        return newCourse;
    }

    /** Update course with optional thumbnail replacement
     * @param {string} _id - The ID of the course to update
     * @param {Object} data - The updated course data
     * @param {Object} thumbnailFile - The new thumbnail file to upload
     * @returns {Object} The updated course
     */
    async updateById(_id, data, thumbnailFile) {
        const course = await super.findById(_id);

        let thumbnail = course.thumbnail;

        if (thumbnailFile) {
            if (thumbnail?.publicId) {
                await cloudinaryService.delete(thumbnail.publicId, thumbnail.type);
            }

            // 2) Upload new one
            const uploaded = await cloudinaryService.upload(thumbnailFile, "courses/thumbnails/");
            thumbnail = {
                ...uploaded
            };
        }

        return await super.updateById(_id, { ...data, thumbnail },{ new: true });
    }

    /** Delete course and its associated thumbnail from Cloudinary
     * @param {string} _id - The ID of the course to delete
     * @returns {Object} The deleted course
     */
    async deleteById(_id) {
        const course = await super.findById(_id);

        if (course) {
            if(course.thumbnail?.publicId) await cloudinaryService.delete(course.thumbnail.publicId, course.thumbnail.type);
            return await super.deleteById(_id);
        }else {
            throw new AppError.notFound("Course not found");
        }
    }
}

export default new CourseService(Course);

