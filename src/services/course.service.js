import Course from "../models/Course.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./cloudinary.service.js";

class CourseService extends BaseService {

    constructor() {
        super(Course);
    }

    /**
     * Creates a new course with optional thumbnail upload.
     * @param {Object} data - The course data.
     * @returns {Object} The newly created course.
     */
    async create(data, fileBuffer) {
        let thumbnail = null;

        if (fileBuffer) { // If there's a thumbnail to upload
            thumbnail = fileBuffer;
            const uploadResult = await cloudinaryService.uploadBuffer(thumbnail, "courses",);

            thumbnail = {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            };
        }

        const newCourse = await super.create({...data, thumbnail});
        return newCourse;
    }
}

export default new CourseService();

