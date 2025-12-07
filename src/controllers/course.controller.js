import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";


/**
 * Course Controller
 * Handles HTTP requests related to courses.
 * Uses CourseService for business logic.
 * Methods:
 * - create: Create a new course
 * - getAll: Retrieve all courses
 * - getById: Retrieve a course by ID
 * - update: Update a course by ID
 * - delete: Delete a course by ID
 */
class CourseController {
    constructor(courseService) {
        this.courseService = courseService;
    }

    /* --- --- --- Helper Methods --- --- --- */

    /** Private method to filter body based on role
     * @param {string} role - The role of the user
     * @param {object} body - The body of the request
     * @returns {object} - The filtered body    
     * */
    _filterBody(role, body) {
        const allowedFields = {
            admin: ['title', 'subTitle', 'description', 'features', 'subject', 'gradeLevel', 'status', 'language', 'tags', 'teacherId', 'price', 'isFree'], // Admin can edit all
            teacher: ['title', 'subTitle', 'description', 'features', 'subject', 'gradeLevel', 'language', 'tags'], // Teacher cannot edit teacherId, status (directly), or stats
            parent: [], // Parents cannot create/edit courses
            student: [] // Students cannot create/edit courses
        };

        const allowed = allowedFields[role] || [];
        const filtered = {};
        
        Object.keys(body).forEach(key => {
            if (allowed.includes(key)) filtered[key] = body[key];
        });

        return filtered;
    }

    /** Create a new Course
     * @route POST /api/v1/groups
    */
    createCourse = asyncHandler(async (req, res, next) => {
        const { id, role } = req.user;

        if (!['admin', 'teacher'].includes(role)) throw AppError.forbidden("Only teachers and admins can create courses");
        
        const payload = this._filterBody(role, req.body);
        const file = req.file || null;

        if (role === 'teacher') {
            payload.teacherId = id;
            payload.status = 'draft'; 

        } else if (role === 'admin') {
            if (!req.body.teacherId) throw AppError.badRequest("Admin must specify a teacherId");
            payload.teacherId = req.body.teacherId; 

        }

        const newCourse = await this.courseService.createCourse(role, file, payload);

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: newCourse
        });

    });

    /**
     * Get All Courses
     * @route Get /api/v1/groups
    */
    getAllCourses = asyncHandler(async (req, res, next) => {
        const { page, limit, ...filters } = req.query;
        const data = await this.courseService.getCourses(filters, { page, limit });
        res.status(200).json({
            success: true,
            ...data

        });
    });

    /**
    * Get a Course by ID
    * @route Get /api/v1/groups/:id
   */
    getCourseById = asyncHandler(async (req, res, next) => {
        const course = await this.courseService.getCourseById(req.params.id);
        res.status(200).json({
            success: true,
            data: course
        });
    });


    /**
     * Edit a Course
     * @route Patch /api/v1/groups/:id
    */
    updateCourseById = asyncHandler(async (req, res, next) => {
        const data = req.body;
        const file = req.file ? req.file : null;

        if (!data && !file)
            throw AppError.badRequest("No data provided for update");
        const id = req.params.id;
        const updatedCourse = await this.courseService.updateCourseById(
            id,
            data,
            file,
            req.user._id,
            req.user.role
        );

        res.status(200).json(updatedCourse);
    });


    /**
  * Delete a Course
  * @route DELETE /api/v1/groups/:id
 */
    deleteCourseById = asyncHandler(async (req, res, next) => {
        const courseId = req.params.id;
        await this.courseService.deleteCourseById(
            courseId,
            req.user._id,
            req.user.role
        );

        res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });
    });
}

export default CourseController;