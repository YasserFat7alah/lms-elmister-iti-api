import courseService from "../services/course.service.js";
import { asyncHandler } from 'express-async-handler';
import ApiError from "../utils/ApiError.js";


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

/* --- --- --- CREATE COURSE --- --- --- */
    create = asyncHandler(async (req, res, next) => {
            const data = req.body;
            const file = req.file ? req.file : null;
            if(!data.title || !data.description) 
                throw new ApiError.badRequest("Title and Description are required");

            const newCourse = await this.courseService.create(data, file);
            res.status(201).json(newCourse);

    });

/* --- --- --- GET ALL COURSES --- --- --- */
    getAll = asyncHandler(async (req, res, next) => {
            const courses = await this.courseService.findAll();
            res.status(200).json(courses);
    });

/* --- --- --- GET COURSE BY ID --- --- --- */
    getById = asyncHandler(async (req, res, next) => {
            const course = await this.courseService.findById(req.params.id);
            res.status(200).json(course);
    });

/* --- --- --- UPDATE COURSE --- --- --- */
    updateById = asyncHandler(async (req, res, next) => {
            const data = req.body;
            const file = req.file ? req.file : null;

            if(!data || !file) 
                throw new ApiError.badRequest("No data provided for update");
            const id = req.params.id;
            const updatedCourse = await this.courseService.updateById(id, data, file);
            res.status(200).json(updatedCourse);
        });

/* --- --- --- DELETE COURSE --- --- --- */   
    deleteById = asyncHandler(async (req, res, next) => {
            await this.courseService.deleteById(req.params.id);
            res.status(204).send();
        });
}

export default new CourseController(courseService);