import TeacherProfile from "../../models/users/TeacherProfile.js";
import BaseService from "../base.service.js";
import cloudinaryService from "../helpers/cloudinary.service.js";
import AppError from "../../utils/app.error.js";
import Course from "../../models/Course.js";
import Enrollment from "../../models/Enrollment.js";
import Payout from "../../models/Payout.js";
import mongoose from "mongoose";

class TeacherService extends BaseService {
    constructor(model) {
        super(model);
    }

    /** Get Teacher Dashboard Analytics
     * @param {string} userId - The ID of the user
     * @param {string} [startDate] - Start date param for analysis
     * @param {string} [endDate] - End date param for analysis
     * @returns {object} Dashboard analytics data
     */
    async getDashboard(userId, startDate, endDate) {

        // Define filters based on dates
        const dateFilter = {};
        const isWeekly = !!(startDate && endDate);

        if (isWeekly) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const enrollmentDateFilter = {};
        if (isWeekly) {
            enrollmentDateFilter["charges.paidAt"] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            enrollmentDateFilter["charges.paidAt"] = { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) };
        }

        const studentGrowthDateFilter = isWeekly ?
            { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } :
            { createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } };

        const courseGrowthDateFilter = isWeekly ?
            { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } :
            { createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } };


        const [
            totalCourses,
            activeCourses,
            completedCourses, // Using archived as completed for now
            draftCourses,
            reviewCourses,
            totalStudentsResult,
            recentCourses,
            earningsAggregation,
            teacherProfile,
            pendingPayoutsCount,
            studentGrowth,
            courseGrowth
        ] = await Promise.all([
            // 1. Total Courses (Lifetime stats)
            Course.countDocuments({ teacherId: userId }),

            // 2. Active Courses (Published)
            Course.countDocuments({ teacherId: userId, status: 'published' }),

            // 3. Completed Courses (Archived)
            Course.countDocuments({ teacherId: userId, status: 'archived' }),

            // 4. Draft Courses
            Course.countDocuments({ teacherId: userId, status: 'draft' }),

            // 5. In Review Courses
            Course.countDocuments({ teacherId: userId, status: 'in-review' }),

            // 6. Total Students (Unique students enrolled)
            Enrollment.distinct('student', { teacher: userId, status: 'active' }),

            // 7. Recent Courses
            Course.find({ teacherId: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title subject status totalStudents createdAt gradeLevel averageRating'),

            // 8. Earnings Chart (Weekly or Monthly)
            Enrollment.aggregate([
                {
                    $match: {
                        teacher: new mongoose.Types.ObjectId(userId),
                        ...enrollmentDateFilter
                    }
                },
                { $unwind: "$charges" },
                {
                    $group: {
                        _id: isWeekly ?
                            {
                                year: { $year: "$charges.paidAt" },
                                month: { $month: "$charges.paidAt" },
                                day: { $dayOfMonth: "$charges.paidAt" }
                            } : {
                                year: { $year: "$charges.paidAt" },
                                month: { $month: "$charges.paidAt" }
                            },
                        amount: { $sum: "$charges.teacherShare" }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
            ]),

            // 9. Teacher Profile (Financials & Ratings)
            TeacherProfile.findOne({ user: userId }).select('balance totalEarnings pendingPayouts averageRating totalRatings'),

            // 10. Pending Payout Requests Count
            Payout.countDocuments({ teacher: userId, status: 'pending' }),

            // 11. Student Growth
            Enrollment.aggregate([
                {
                    $match: {
                        teacher: new mongoose.Types.ObjectId(userId),
                        ...studentGrowthDateFilter
                    }
                },
                {
                    $group: {
                        _id: isWeekly ? {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        } : {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
            ]),

            // 12. Course Growth
            Course.aggregate([
                {
                    $match: {
                        teacherId: new mongoose.Types.ObjectId(userId),
                        ...courseGrowthDateFilter
                    }
                },
                {
                    $group: {
                        _id: isWeekly ? {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        } : {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
            ])
        ]);

        const totalStudents = totalStudentsResult.length;

        // Process Data for Charts
        const formatData = (dataPoints, valueKey, startDateStr, endDateStr) => {
            const result = [];

            if (isWeekly) {
                // Generate daily buckets for the range
                const start = new Date(startDateStr);
                const end = new Date(endDateStr);
                const dataMap = new Map();

                dataPoints.forEach(item => {
                    const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
                    dataMap.set(key, item[valueKey]);
                });

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const key = `${year}-${month}-${day}`;

                    result.push({
                        name: d.toLocaleDateString('default', { weekday: 'short' }), // Mon, Tue...
                        fullDate: key,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }

            } else {
                // Monthly (Default Last 12 Months)
                const dataMap = new Map(dataPoints.map(item => [
                    `${item._id.year}-${item._id.month}`,
                    item[valueKey]
                ]));

                for (let i = 11; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const key = `${year}-${month}`;

                    result.push({
                        name: d.toLocaleString('default', { month: 'short' }),
                        year: year,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }
            }
            return result;
        };

        const earningsData = formatData(earningsAggregation, 'amount', startDate, endDate);
        const studentsData = formatData(studentGrowth, 'count', startDate, endDate);
        const coursesData = formatData(courseGrowth, 'count', startDate, endDate);

        // Merge for Academic Chart (Students vs Courses)
        const academicGrowth = studentsData.map((item, index) => ({
            name: item.name,
            students: item.count,
            courses: coursesData[index].count || 0
        }));

        // Course Distribution Data for Circle Chart
        const courseDistribution = [
            { name: "Published", value: activeCourses, color: "#10b981" },
            { name: "Draft", value: draftCourses, color: "#9ca3af" },
            { name: "Review", value: reviewCourses, color: "#f59e0b" },
            { name: "Archived", value: completedCourses, color: "#ef4444" },
        ].filter(item => item.value > 0);

        return {
            stats: {
                totalCourses,
                activeCourses,
                completedCourses,
                totalStudents,

                // Ratings
                averageRating: teacherProfile?.averageRating || 0,
                totalRatings: teacherProfile?.totalRatings || 0,

                // Financials
                balance: teacherProfile?.balance || 0,
                totalEarnings: teacherProfile?.totalEarnings || 0,
                pendingPayoutsAmount: teacherProfile?.pendingPayouts || 0,
                pendingPayoutsCount: pendingPayoutsCount || 0
            },
            recentCourses,
            graphs: {
                earnings: earningsData,
                academicGrowth,
                courseDistribution
            },
            meta: {
                view: isWeekly ? 'weekly' : 'monthly',
                startDate,
                endDate
            }
        };
    }

    /** Get Academic Chart Data
     * @param {string} userId
     * @param {string} startDate
     * @param {string} endDate
     */
    async getAcademicChart(userId, startDate, endDate) {
        const isWeekly = !!(startDate && endDate);

        let startObj, endObj;
        if (isWeekly) {
            startObj = new Date(startDate);
            endObj = new Date(endDate);
            endObj.setHours(23, 59, 59, 999);
        }

        const dateFilter = isWeekly ?
            { createdAt: { $gte: startObj, $lte: endObj } } :
            { createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } };

        const [studentGrowth, courseGrowth] = await Promise.all([
            Enrollment.aggregate([
                { $match: { teacher: new mongoose.Types.ObjectId(userId), ...dateFilter } },
                {
                    $group: {
                        _id: isWeekly ? {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        } : {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
            ]),
            Course.aggregate([
                { $match: { teacherId: new mongoose.Types.ObjectId(userId), ...dateFilter } },
                {
                    $group: {
                        _id: isWeekly ? {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        } : {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
            ])
        ]);

        const formatData = (dataPoints, valueKey) => {
            const result = [];
            if (isWeekly) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const dataMap = new Map();
                dataPoints.forEach(item => {
                    const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
                    dataMap.set(key, item[valueKey]);
                });
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const key = `${year}-${month}-${day}`;
                    result.push({
                        name: d.toLocaleDateString('default', { weekday: 'short' }),
                        fullDate: key,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }
            } else {
                const dataMap = new Map(dataPoints.map(item => [`${item._id.year}-${item._id.month}`, item[valueKey]]));
                for (let i = 11; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const key = `${year}-${month}`;
                    result.push({
                        name: d.toLocaleString('default', { month: 'short' }),
                        year: year,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }
            }
            return result;
        };

        const studentsData = formatData(studentGrowth, 'count');
        const coursesData = formatData(courseGrowth, 'count');

        return studentsData.map((item, index) => ({
            name: item.name,
            students: item.count,
            courses: coursesData[index].count || 0
        }));
    }

    /** Get Earnings Chart Data
     * @param {string} userId
     * @param {string} startDate
     * @param {string} endDate
     */
    async getEarningsChart(userId, startDate, endDate) {
        const isWeekly = !!(startDate && endDate);
        const enrollmentDateFilter = {};

        if (isWeekly) {
            const startObj = new Date(startDate);
            const endObj = new Date(endDate);
            endObj.setHours(23, 59, 59, 999);

            enrollmentDateFilter["charges.paidAt"] = {
                $gte: startObj,
                $lte: endObj
            };
        } else {
            enrollmentDateFilter["charges.paidAt"] = { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) };
        }

        const earningsAggregation = await Enrollment.aggregate([
            { $match: { teacher: new mongoose.Types.ObjectId(userId) } }, // select all teacher enrollments first optimization
            { $unwind: "$charges" },
            { $match: { "charges.paidAt": enrollmentDateFilter["charges.paidAt"] } },
            {
                $group: {
                    _id: isWeekly ? {
                        year: { $year: "$charges.paidAt" },
                        month: { $month: "$charges.paidAt" },
                        day: { $dayOfMonth: "$charges.paidAt" }
                    } : {
                        year: { $year: "$charges.paidAt" },
                        month: { $month: "$charges.paidAt" }
                    },
                    amount: { $sum: "$charges.teacherShare" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, ...((isWeekly) && { "_id.day": 1 }) } }
        ]);

        const formatData = (dataPoints, valueKey) => {
            const result = [];
            if (isWeekly) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const dataMap = new Map();
                dataPoints.forEach(item => {
                    const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
                    dataMap.set(key, item[valueKey]);
                });
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const day = d.getDate();
                    const key = `${year}-${month}-${day}`;
                    result.push({
                        name: d.toLocaleDateString('default', { weekday: 'short' }),
                        fullDate: key,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }
            } else {
                const dataMap = new Map(dataPoints.map(item => [`${item._id.year}-${item._id.month}`, item[valueKey]]));
                for (let i = 11; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const key = `${year}-${month}`;
                    result.push({
                        name: d.toLocaleString('default', { month: 'short' }),
                        year: year,
                        [valueKey]: dataMap.get(key) || 0
                    });
                }
            }
            return result;
        };

        return formatData(earningsAggregation, 'amount');
    }

    /** Upload or update teacher video intro
     * @param {string} userId - The ID of the user
     * @param {object} videoFile - The video file to upload
     * @returns {object} The uploaded video intro details
     */
    async uploadVideoIntro(userId, videoFile) {

        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        const uploadResult = await cloudinaryService.upload(videoFile, "teachers/videos", { resource_type: "video" });

        if (profile.videoIntro?.publicId && uploadResult.publicId) {
            await cloudinaryService.delete(profile.videoIntro.publicId, 'video');
        }

        profile.videoIntro = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            type: uploadResult.type
        };
        await profile.save();

        return profile.videoIntro;
    }

    /** Add a Certificate
     * @param {string} userId - The ID of the user
     * @param {object} file - The certificate file to upload
     * @returns {object} The uploaded certificate details
     * */
    async addCertificate(userId, file, title = "New Certificate") {
        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        // Upload Certificate Image
        const uploadResult = await cloudinaryService.upload(file, "elmister/teachers/certificates", { resource_type: "image" });

        const newCert = {
            title,
            image: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: uploadResult.type
            }
        };

        // Push to array
        profile.certificates.push(newCert);
        await profile.save();

        return profile.certificates;
    }

    /** Remove a Certificate
     * @param {string} userId - The ID of the user
     * @param {string} certificateId - The ID of the certificate
     */
    async removeCertificate(userId, certificateId) {
        const profile = await this.model.findOne({ user: userId });
        if (!profile) throw AppError.notFound("Teacher profile not found");

        // Find the cert to delete from Cloudinary
        const cert = profile.certificates.id(certificateId);
        if (!cert) throw AppError.notFound("Certificate not found");

        if (cert.image?.publicId) {
            await cloudinaryService.delete(cert.image.publicId);
        }

        // Pull from array using Mongoose .pull()
        profile.certificates.pull(certificateId);
        await profile.save();

        return profile.certificates;
    }

    /** Check if teacher profile exists for a user
     * @param {string} userId - The ID of the user
     * @returns {boolean} Whether the profile exists
     */
    async checkProfileExists(userId) {
        const profile = await this.model.findOne({ user: userId }).select('_id');
        return !!profile;
    }
}

export default new TeacherService(TeacherProfile);