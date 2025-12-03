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

    /**
     * Create a new Course
     * @route POST /api/v1/groups
    */
    createCourse = asyncHandler(async (req, res, next) => {
        const data = req.body;
        const file = req.file ? req.file : null;

        data.teacherId = req.user._id;

        const newCourse = await this.courseService.createCourse(data, file);
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