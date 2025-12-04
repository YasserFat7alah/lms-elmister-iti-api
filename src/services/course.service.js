import Course from "../models/Course.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./cloudinary.service.js";
import AppError from "../utils/app.error.js";

class CourseService extends BaseService {

    constructor(model) {
        super(model);
    }

    /** Creates a new course with optional thumbnail upload.
     * @param {Object} data - The course data.
     * @param {Object} thumbnailFile - The thumbnail file to upload.
     * @returns {Object} The newly created course.
     */
    async createCourse(data, thumbnailFile) {
        let thumbnail = null;

        if (thumbnailFile) { // If there's a thumbnail to upload
            const uploadResult = await cloudinaryService.upload(thumbnailFile, "courses/thumbnails/", { resource_type: "image" });

            thumbnail = {
                url: uploadResult.url,
                publicId: uploadResult.publicId
            };
        }
        const newCourse = await super.create({ ...data, thumbnail });
        return newCourse;
    }


    /**
     * Retrieve courses by given filters and options.
     * @param {Object} filters - Filter objects.
     * @param {Object} options - Options for pagination.
     * @return {Promise<Object>} - An object containing total number of courses, current page, total number of pages, and an array of course objects.
     */
    async getCourses(filters, options) {
        const { teacherId, status, subject, gradeLevel } = filters;
        const { page = 1, limit = 10 } = options;

        const queryObj = {};
        if (teacherId) queryObj.teacherId = teacherId;
        if (status) queryObj.status = status;
        if (subject) queryObj.subject = subject;
        if (gradeLevel) queryObj.gradeLevel = gradeLevel;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [courses, total] = await Promise.all([
            this.model
                .find(queryObj)
                .skip(skip)
                .limit(limitNum)
                .populate('teacherId', 'name username')
                .sort({ createdAt: -1 }),
            super.count(queryObj)
        ]);

        return {
            total,  // Total number of docs "Courses"
            page: pageNum,
            pages: Math.ceil(total / limitNum), // Total number of pages
            data: courses
        };
    }


    /**
     * Retrieve a course by ID
     * @param {string} _id - The ID of the course to retrieve
     * @returns {Promise<Course>} The course object
     */
    async getCourseById(_id) {
        const course = await this.model
            .findById(_id)
            .populate('teacherId', 'name username')
            .populate('groups', 'title startingDate capacity studentsCount status');

        if (!course) {
            throw AppError.notFound("Course not found");
        }
        return course;
    }


    /**
     * Updates a course by ID.
     * Checks if the teacher is the owner of the course before updating.
     * If a new thumbnail is provided, it will replace the old one.
     * @param {string} _id - The ID of the course to update
     * @param {Object} data - The updated course data
     * @param {Object} thumbnailFile - The new thumbnail file to upload
     * @param {string} userId - The ID of the user updating the course
     * @param {string} userRole - The role of the user updating the course
     * @returns {Object} The updated course
     * @throws {Forbidden} You can only update your own courses
     */
    async updateCourseById(_id, data, thumbnailFile, userId, userRole) {
        const course = await super.findById(_id);

        if (!course) {
            throw AppError.notFound("Course not found");
        }

        if (userRole === 'teacher' && course.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only update your own courses");
        }
        let thumbnail = course.thumbnail;

        if (thumbnailFile) {
            if (thumbnail?.publicId) {
                await cloudinaryService.delete(thumbnail.publicId, thumbnail.type);
            }

            //Upload new one
            const uploaded = await cloudinaryService.upload(thumbnailFile, "courses/thumbnails/");
            thumbnail = {
                ...uploaded
            };
        }

        return await super.updateById(_id, { ...data, thumbnail });
    }

    /** Delete course and its associated thumbnail from Cloudinary
     * @param {string} _id - The ID of the course to delete
     * @returns {Object} The deleted course
     * @throws {Forbidden} You can only delete your own courses
     * @throws {BadRequest} Cannot delete course with existing groups
     */
    async deleteCourseById(_id, userId, userRole) {
        const course = await super.findById(_id);
        if (!course) {
            throw AppError.notFound("Course not found");
        }

        // Teachers can only delete their own courses
        if (userRole === 'teacher' && course.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only delete your own courses");
        }

        // Prevent deletion if course has groups
        if (course.groups && course.groups.length > 0) {
            throw AppError.badRequest("Cannot delete course with existing groups");
        }

        if (course.thumbnail?.publicId) {
            await cloudinaryService.delete(course.thumbnail.publicId, course.thumbnail.type);
        }

        return await super.deleteById(_id);
    }

    //later..............!!!!
    async updateStatistics(courseId) {
        const course = await super.findById(courseId);

        // Count total students from all groups
        const groups = await this.model.db.model('Group').find({ courseId });
        const totalStudents = groups.reduce((sum, group) => sum + group.studentsCount, 0);

        course.totalStudents = totalStudents;
        await course.save();

        return course;
    }

}

export default CourseService;

