import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";

// Services
import EnrollmentService from "../services/enrollment.service.js";
import Enrollment from "../models/Enrollment.js"; // Needed for Dependency Injection

class CourseController {
    
    constructor(courseService) {
        this.courseService = courseService;
        // بنعمل نسخة من EnrollmentService وبنبعت له ال Model بتاعه
        this.enrollmentService = new EnrollmentService(Enrollment);
    }

    // --- Helper: Permission & Field Sanitization ---
    _filterBody(role, body) {
        const allowedFields = {
            admin: ['title', 'subTitle', 'description', 'features', 'subject', 'gradeLevel', 'status', 'courseLanguage', 'tags', 'teacherId', 'price', 'isFree'], 
            teacher: ['title', 'subTitle', 'description', 'features', 'subject', 'gradeLevel', 'courseLanguage', 'tags'], 
            parent: [],
            student: [] 
        };

        const allowed = allowedFields[role] || [];
        const filtered = {};
        
        Object.keys(body).forEach(key => {
            if (allowed.includes(key)) filtered[key] = body[key];
        });

        return filtered;
    }

    /**
     * Create a new Course
     */
    createCourse = asyncHandler(async (req, res, next) => {
        const { role } = req.user;
        
        if (!['admin', 'teacher'].includes(role)) {
            throw AppError.forbidden("Only teachers and admins can create courses");
        }

        const payload = this._filterBody(role, req.body);
        const file = req.file || null;

        // Context Injection
        if (role === 'teacher') {
            payload.teacherId = req.user._id;
            // Teacher's course is always draft initially
        } else if (role === 'admin') {
            if (!req.body.teacherId) throw AppError.badRequest("Admin must specify a teacherId");
            payload.teacherId = req.body.teacherId; 
        }

        const newCourse = await this.courseService.createCourse(payload, file, role);

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: newCourse
        });
    });

    /**
     * Get All Courses (Uses EnrollmentService for Students)
     */
    getAllCourses = asyncHandler(async (req, res, next) => {
        const { page, limit, ...filters } = req.query;
        // User might be undefined if route is public, assuming auth middleware handles this or sets req.user
        const user = req.user || {}; 
        
        const queryOptions = { page, limit };
        const serviceFilters = { ...filters }; // Copy filters from query

        // --- Role Based Logic ---
        
        // 1. Student: See ONLY subscribed courses
        if (user.role === 'student') {
            // استخدمنا السيرفيس هنا عشان نجيب الكورسات النشطة
            const activeEnrollments = await this.enrollmentService.listByStudent(user._id);
            
            // EnrollmentService returns docs with 'course' field populated or as ID
            // We map to get an array of Course IDs
            const subscribedCourseIds = activeEnrollments.map(enrollment => enrollment.course);
            
            serviceFilters._id = { $in: subscribedCourseIds };
            serviceFilters.status = 'published'; // Extra safety
        } 
        
        // 2. Teacher: See ONLY their own courses (Drafts included)
        else if (user.role === 'teacher') {
            serviceFilters.teacherId = user._id; 
        }
        
        // 3. Admin: See ALL (No forced filters)
        else if (user.role === 'admin') {
            // Admin sees everything, filters come purely from req.query
        }
        
        // 4. Public / Parent: See ONLY Published
        else {
            serviceFilters.status = 'published';
            // Optional: You might want to ensure only courses with active groups are shown here
            // serviceFilters.groups = { $not: { $size: 0 } }; 
        }

        const result = await this.courseService.getCourses(serviceFilters, queryOptions);

        res.status(200).json({
            success: true,
            ...result
        });
    });

    /**
     * Get Course By ID
     */
    getCourseById = asyncHandler(async (req, res, next) => {
        const course = await this.courseService.getCourseById(req.params.id);
        
        // Optional: Privacy Check
        // لو الطالب حاول يفتح كورس مش مشترك فيه عن طريق الـ ID المباشر
        // لو البيزنس بتاعك بيمنع ده، ممكن تزود تشيك هنا باستخدام enrollmentService برضو
        
        res.status(200).json({
            success: true,
            data: course
        });
    });

    /**
     * Update Course
     */
    updateCourseById = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const { role, _id: userId } = req.user;
        const requestedStatus = req.body.status;
        const file = req.file || null;

        const payload = this._filterBody(role, req.body);

        // Prepare context for the Service to decide logic
        let actionContext = { userId, role, isPublishRequest: false };

        if (role === 'teacher') {
            // Check if teacher is requesting a status change (Publish/Review)
            if (requestedStatus === 'published' || requestedStatus === 'in-review') {
                actionContext.isPublishRequest = true;
                actionContext.requestedStatus = requestedStatus;
            }
        } else if (role === 'admin') {
            // Admin commands override everything
            if (requestedStatus) payload.status = requestedStatus;
        }

        const updatedCourse = await this.courseService.updateCourseById(id, payload, file, actionContext);

        res.status(200).json({
            success: true,
            data: updatedCourse
        });
    });

    /**
     * Delete Course
     */
    deleteCourseById = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const { role, _id: userId } = req.user;

        // Admin = Hard Delete, Teacher = Soft Delete (Archive)
        const isHardDelete = role === 'admin';

        await this.courseService.deleteCourseById(id, userId, role, isHardDelete);

        res.status(200).json({
            success: true,
            message: isHardDelete ? "Course permanently deleted" : "Course archived successfully"
        });
    });
}

export default CourseController;