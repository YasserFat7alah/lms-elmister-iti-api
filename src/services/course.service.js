import Course from "../models/Course.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./helpers/cloudinary.service.js";
import AppError from "../utils/app.error.js";
import Group from "../models/Group.js";

class CourseService extends BaseService {

    constructor(model) {
        super(model);
    }

    /** Creates a new course with optional thumbnail upload.
     * @param {Object} data - The course data.
     * @param {Object} thumbnailFile - The thumbnail file to upload.
     * @returns {Object} The newly created course.
     */
    async createCourse(payload) {
        const newCourse = await super.create(payload);
        return newCourse;
    }

    /** Retrieve courses by given filters and options.
     * @param {Object} filters - Filter objects.
     * @param {Object} options - Options for pagination.
     * @return {Promise<Object>} - An object containing total number of courses, current page, total number of pages, and an array of course objects.
     */
    async getCourses(filters, options) {
        const { page = 1, limit = 10, minPrice, maxPrice, populate, calculatePrice } = options;
        const skip = (page - 1) * limit;

        if (minPrice !== undefined || maxPrice !== undefined) {
            const priceQuery = {};
            if (minPrice) priceQuery.price = { $gte: Number(minPrice) };
            if (maxPrice) priceQuery.price = { ...priceQuery.price, $lte: Number(maxPrice) };

            const eligibleGroups = await Group.find(priceQuery).distinct('courseId');

            if (filters._id) {
                filters.$and = [{ _id: filters._id }, { _id: { $in: eligibleGroups } }];
                delete filters._id;
            } else {
                filters._id = { $in: eligibleGroups };
            }
        }

        const query = this.model.find(filters)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        if (populate) query.populate(populate);

        // 4. Execute Query & Count - AND Aggregate Filters
        const [courses, total, distinctSubjects, distinctGrades, distinctLanguages] = await Promise.all([
            query,
            this.model.countDocuments(filters),
            this.model.distinct('subject', { status: 'published' }),
            this.model.distinct('gradeLevel', { status: 'published' }),
            this.model.distinct('courseLanguage', { status: 'published' })
        ]);

        if (calculatePrice && courses.length > 0) {
            const courseIds = courses.map(c => c._id);
            const pricingMap = await this._getMinPrices(courseIds);

            courses.forEach(course => {
                const priceInfo = pricingMap[course._id.toString()];
                course.minCost = priceInfo ? priceInfo.minCost : 0;
                course.currency = priceInfo ? priceInfo.currency : 'usd';
            });
        }

        return {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: courses,
            filters: {
                subjects: distinctSubjects.sort(),
                gradeLevels: distinctGrades.sort((a, b) => a - b), // Numeric sort if possible
                languages: distinctLanguages.sort()
            }
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
            .populate({
                path: 'teacherId',
                populate: { path: 'teacherData' } // Populate virtual teacherData to get profile details
            })
            .populate({
                path: 'groups',
                populate: {
                    path: 'lessons',
                    select: 'title type order'
                }
            })
            .populate({
                path: 'reviews',
                populate: { path: 'user', select: 'name avatar' }
            })
            .populate({
                path: 'comments',
                populate: { path: 'user', select: 'name avatar role' }
            })
            .lean({ virtuals: true });

        if (!course) {
            throw AppError.notFound("Course not found");
        }

        // Calculate pricing
        const pricingMap = await this._getMinPrices([_id]);
        const priceInfo = pricingMap[_id.toString()];

        course.minCost = priceInfo ? priceInfo.minCost : 0;
        course.currency = priceInfo ? priceInfo.currency : 'usd';

        // Calculate Instructor Stats (Courses & Lessons)
        if (course.teacherId) {
            const teacherId = course.teacherId._id;
            const stats = await this.model.aggregate([
                { $match: { teacherId: teacherId } }, // Filter by teacher
                { $lookup: { from: 'groups', localField: 'groups', foreignField: '_id', as: 'groupData' } }, // Lookup groups
                {
                    $project: {
                        studentsCount: {
                            $sum: {
                                $map: { input: "$groupData", as: "g", in: { $ifNull: ["$$g.studentsCount", 0] } }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCourses: { $sum: 1 },
                        totalStudents: { $sum: "$studentsCount" }
                    }
                }
            ]);

            const instructorStats = stats[0] || { totalCourses: 0, totalStudents: 0 };

            // Attach to teacherId object
            course.teacherId.coursesCount = instructorStats.totalCourses;
            course.teacherId.totalStudents = instructorStats.totalStudents;
        }

        return course;
    }

    /** Updates a course by ID.
     * Checks if the teacher is the owner of the course before updating.
     * If a new thumbnail is provided, it will replace the old one.
     * @param {string} _id - The ID of the course to update
     * @param {Object} data - The updated course data
     * @param {Object} thumbnailFile - The new thumbnail file to upload
     * @param {Object} context - The request context (userId, userRole, isPublishRequest, requestedStatus) 
     * @returns {Object} The updated course
     * @throws {Forbidden} You can only update your own courses
     */
    async updateCourseById(_id, data, context) {
        const { userId, userRole } = context;

        // 1. Existance check
        const course = await super.findById(_id);
        if (!course) throw AppError.notFound("Course not found");

        // 2. Ownership check
        if (userRole === 'teacher' && course.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only update your own courses");
        }

        if (data.thumbnail?.publicId && course.thumbnail?.publicId) {
            if (data.thumbnail?.publicId !== course.thumbnail.publicId) {
                await cloudinaryService.delete(course.thumbnail.publicId, course.thumbnail.type || 'image');
            }
        }

        if (data.video?.publicId && course.video?.publicId) {
            if (data.video?.publicId !== course.video.publicId) {
                await cloudinaryService.delete(course.video.publicId, course.video.type || 'video');
            }
        }

        const updatedCourse = await Course.findByIdAndUpdate(_id, data, {
            new: true,
            runValidators: true
        });
        return updatedCourse;
    }



    /** Delete course and its associated thumbnail from Cloudinary
     * @param {string} _id - The ID of the course to delete
     * @returns {Object} The deleted course
     * @throws {Forbidden} You can only delete your own courses
     * @throws {BadRequest} Cannot delete course with existing groups
     */
    async deleteCourseById(_id, context) {
        const { userId, userRole, isHardDelete } = context;

        // Existance check
        const course = await this.model.findById(_id);
        if (!course) throw AppError.notFound("Course not found");

        // Ownership Check
        if (userRole === 'teacher' && course.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only delete your own courses");
        }

        // Teacher: Soft Delete (Archive)
        if (!isHardDelete) return await super.updateById(_id, { status: 'archived' });


        // Admin: Hard Delete
        if (isHardDelete) {
            if (course.thumbnail?.publicId) {
                await cloudinaryService.delete(course.thumbnail.publicId, course.thumbnail.type);
            }
            if (course.video?.publicId) {
                await cloudinaryService.delete(course.video.publicId, course.video.type);
            }
            return await super.deleteById(_id);
        }
    }

    async updateStatistics(courseId) {
        const course = await super.findById(courseId);

        // Count total students from all groups
        const groups = await this.model.db.model('Group').find({ courseId });
        const totalStudents = groups.reduce((sum, group) => sum + group.studentsCount, 0);

        course.totalStudents = totalStudents;
        await course.save();

        return course;
    }

    /**
     * Aggregates Group collection to find the lowest price for a list of courses
     * @param {Array} courseIds 
     * @returns {Object} Map { courseId: { minCost, currency } }
     */
    async _getMinPrices(courseIds) {
        const stats = await this.model.db.model('Group').aggregate([
            {
                $match: {
                    courseId: { $in: courseIds },
                    status: { $ne: 'closed' }
                }
            },
            { $sort: { price: 1 } },
            {
                $group: {
                    _id: "$courseId",
                    minCost: { $first: "$price" },
                    currency: { $first: "$currency" }
                }
            }
        ]);

        const map = {};
        stats.forEach(item => {
            map[item._id.toString()] = {
                minCost: item.minCost,
                currency: item.currency
            };
        });
        return map;
    }
}

export default new CourseService(Course);

