import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";
import enrollmentService from "../services/subscriptions/enrollment.service.js";
import courseService from "../services/course.service.js";
import ParentProfile from "../models/users/ParentProfile.js";
import User from "../models/users/User.js";
import mongoose from "mongoose";

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
    constructor({ ...services }) {
        this.courseService = services.courseService;
        this.enrollmentService = services.enrollmentService;
    }

    /* --- --- --- Helper Methods --- --- --- */

    /** Private method to filter body based on role
     * @param {string} role - The role of the user
     * @param {object} body - The body of the request
     * @returns {object} - The filtered body
     * */
    _filterBody(role, body) {
        const allowedFields = {
            admin: [
                "title",
                "subTitle",
                "description",
                "features",
                "subject",
                "gradeLevel",
                "status",
                "courseLanguage",
                "tags",
                "teacherId",
                "price",
                "isFree",
                "thumbnail",
                "video",
            ], // Admin can edit all
            teacher: [
                "title",
                "subTitle",
                "description",
                "features",
                "subject",
                "gradeLevel",
                "courseLanguage",
                "tags",
                "thumbnail",
                "video",
            ], // Teacher cannot edit teacherId, status (directly), or stats
            parent: [], // Parents cannot create/edit courses
            student: [], // Students cannot create/edit courses
        };

        const allowed = allowedFields[role] || [];
        const filtered = {};

        Object.keys(body).forEach((key) => {
            if (allowed.includes(key)) filtered[key] = body[key];
        });

        return filtered;
    }

    /** Create a new Course
     * @body {object} - The course data
     * @access Private (teacher, admin)
     */
    createCourse = asyncHandler(async (req, res, next) => {
        const { id, role } = req.user;
        if (!["admin", "teacher"].includes(role))
            throw AppError.forbidden("Only teachers and admins can create courses");

        const payload = this._filterBody(role, req.body);

        if (req.body.thumbnail) payload.thumbnail = req.body.thumbnail;
        if (req.body.video) payload.video = req.body.video;

        if (role === "teacher") {
            payload.teacherId = id;
            payload.status = "draft";
        } else if (role === "admin") {
            if (!req.body.teacherId)
                throw AppError.badRequest("Admin must specify a teacherId");
            payload.teacherId = req.body.teacherId;
        }

        const newCourse = await this.courseService.createCourse(payload);

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: newCourse,
        });
    });

    /** Get All Courses
     * @query {string} page - The page number
     * @query {string} limit - The number of items per page
     * @access varies
     */
    getAllCourses = asyncHandler(async (req, res, next) => {
        const { page, limit, minPrice, maxPrice, priceRanges, ...filters } = req.query;
        const { id, role } = req.user || {};

        let populateOptions = [
            {
                path: "teacherId",
                select: "name username avatar email emailVerified teacherData",
            },
        ];
        let calculatePrice = false; // Only for public

        // --- Role Logic ---

        // 1. Student: Only subscribed courses + Only subscribed group populated
        if (role === "student") {
            const enrollments = await this.enrollmentService.listByStudent(id);
            const courseIds = enrollments.map((e) => e.course._id || e.course);
            const groupIds = enrollments.map((e) => e.group._id || e.group); // Get IDs of groups student is in

            filters._id = { $in: courseIds };
            filters.status = "published";

            populateOptions.push({
                path: "groups",
                match: { _id: { $in: groupIds } },
                select: "title schedule status",
            });
        } else if (role === "parent") {
            const parentProfile = await ParentProfile.findOne({ user: id });
            if (!parentProfile?.children?.length) {
                return res.status(200).json({ success: true, total: 0, data: [] });
            }

            // Find all active enrollments for all children
            const enrollments = await this.enrollmentService.model.find({
                student: { $in: parentProfile.children },
                status: "active",
            });

            const courseIds = enrollments.map((e) => e.course);
            const groupIds = enrollments.map((e) => e.group);

            filters._id = { $in: courseIds };
            filters.status = "published";

            populateOptions.push({
                path: "groups",
                match: { _id: { $in: groupIds } },
                select: "title schedule status studentsCount",
            });
        } else if (role === "teacher") {
            filters.teacherId = id;
            populateOptions.push({ path: "groups" });
        } else if (role === "admin") {
            populateOptions.push({ path: "groups" });
        }

        // 5. Public: Published courses + Price Calculation (No groups populated)
        else {
            filters.status = "published";
            calculatePrice = true;
        }

        // --- Search Logic (Multi-field) ---
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');

            // 1. Find teachers matching the name
            const matchingTeachers = await User.find({
                name: { $regex: searchRegex },
                role: 'teacher'
            }).select('_id');
            const teacherIds = matchingTeachers.map(t => t._id);

            // 2. Construct $or query
            filters.$or = [
                { title: { $regex: searchRegex } },
                { subTitle: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { tags: { $regex: searchRegex } },
                { teacherId: { $in: teacherIds } }
            ];

            // Remove 'search' from filters to avoid schema error
            delete filters.search;
        }

        // --- Execute Service ---
        const data = await this.courseService.getCourses(filters, {
            page,
            limit,
            minPrice,
            maxPrice,
            priceRanges,
            populate: populateOptions,
            calculatePrice,
        });

        res.status(200).json({
            success: true,
            message: "Courses fetched successfully",
            ...data,
        });
    });

    /** Get Public Courses (No Auth Role Filters)
     * @query {string} page - The page number
     * @query {string} limit - The number of items per page
     */
    getPublicCourses = asyncHandler(async (req, res, next) => {
        const { page, limit, minPrice, maxPrice, sort, ...filters } = req.query;

        // Force published only
        filters.status = "published";

        // Validate and Cast teacherId
        if (filters.teacherId) {
            if (filters.teacherId === 'undefined' || filters.teacherId === 'null') {
                delete filters.teacherId;
            } else if (mongoose.Types.ObjectId.isValid(filters.teacherId)) {
                filters.teacherId = new mongoose.Types.ObjectId(filters.teacherId);
            }
        }

        let populateOptions = [
            {
                path: "teacherId",
                select: "name username avatar email emailVerified teacherData",
            },
        ];

        // --- Search Logic ---
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            const matchingTeachers = await User.find({
                name: { $regex: searchRegex },
                role: 'teacher'
            }).select('_id');
            const teacherIds = matchingTeachers.map(t => t._id);

            filters.$or = [
                { title: { $regex: searchRegex } },
                { subTitle: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { tags: { $regex: searchRegex } },
                { teacherId: { $in: teacherIds } }
            ];
            delete filters.search;
        }

        const data = await this.courseService.getCourses(filters, {
            page,
            limit,
            minPrice,
            maxPrice,
            sort,
            populate: populateOptions,
            calculatePrice: true,
        });

        res.status(200).json({
            success: true,
            message: "Public courses fetched successfully",
            ...data,
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
            data: course,
        });
    }); //

    /**
     * Edit a Course
     * @route Patch /api/v1/groups/:id
     */
    updateCourseById = asyncHandler(async (req, res, next) => {
        const courseId = req.params.id;
        const { role: userRole, id: userId } = req.user;

        const requestedStatus = req.body.status;

        const payload = this._filterBody(userRole, req.body);

        if (req.body.thumbnail !== undefined)
            payload.thumbnail = req.body.thumbnail;
        if (req.body.video !== undefined) payload.video = req.body.video;

        if (Object.keys(payload).length === 0 && !requestedStatus) {
            throw AppError.badRequest("No data provided for update");
        }

        let context = { userId, userRole, isPublishRequest: false };

        if (userRole === "teacher") {
            if (
                requestedStatus === "published" ||
                requestedStatus === "in-review" ||
                requestedStatus === "draft"
            ) {
                context.isPublishRequest = true;
                context.requestedStatus = requestedStatus;
                payload.status = requestedStatus;
            }
        } else if (userRole === "admin") {
            if (requestedStatus) payload.status = requestedStatus;
        }

        const updatedCourse = await this.courseService.updateCourseById(
            courseId,
            payload,
            context
        );

        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: updatedCourse,
        });
    });

    /** Delete a Course by ID
     * @route DELETE /api/v1/groups/:id
     */
    deleteCourseById = asyncHandler(async (req, res, next) => {
        const courseId = req.params.id;
        const { role, id: userId } = req.user;
        const isHardDelete = role === "admin";

        await this.courseService.deleteCourseById(courseId, {
            userId,
            userRole: role,
            isHardDelete,
        });

        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });
    });
}

export default new CourseController({
    courseService,
    enrollmentService,
});
