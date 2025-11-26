import courseService from "../services/course.service";


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
    async create(req, res, next) {
        try {
            const data = req.body;
            const fileBuffer = req.file ? req.file.buffer : null;
            const newCourse = await this.courseService.create(data, fileBuffer);
            res.status(201).json(newCourse);
        } catch (error) {
            next(error);
        }
    }

/* --- --- --- GET ALL COURSES --- --- --- */
    async getAll(req, res, next) {
        try {
            const courses = await this.courseService.findAll();
            res.status(200).json(courses);
        } catch (error) {
            next(error);
        }
    }

/* --- --- --- GET COURSE BY ID --- --- --- */
    async getById(req, res, next) {
        try {
            const course = await this.courseService.findById(req.params.id);
            res.status(200).json(course);
        } catch (error) {
            next(error);
        }   
    }

/* --- --- --- UPDATE COURSE --- --- --- */
    async update(req, res, next) {
        try {
            const updatedCourse = await this.courseService.updateById(req.params.id, req.body);
            res.status(200).json(updatedCourse);
        } catch (error) {
            next(error);
        }
    }

/* --- --- --- DELETE COURSE --- --- --- */   
    async delete(req, res, next) {
        try {
            await this.courseService.deleteById(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new CourseController(courseService);