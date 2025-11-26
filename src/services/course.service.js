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
    async create(data, file) {
        let thumbnail = null;
        
        if (file) { // If there's a thumbnail to upload
            thumbnail = cloudinaryService.toDataUri(file);
            
            const uploadResult = await cloudinaryService.upload(thumbnail, "courses");

            thumbnail = {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            };
        }
        const newCourse = await super.create({...data, thumbnail});
        console.log("Course saved", newCourse);

        return newCourse;
    }
}

export default new CourseService();

