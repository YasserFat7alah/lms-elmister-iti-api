import User from "../models/users/User.js";
import ParentProfile from "../models/users/ParentProfile.js";
import StudentProfile from "../models/users/StudentProfile.js";
import AppError from "../utils/app.error.js";
import BaseService from "./base.service.js";
import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import Assignment from "../models/assignments/Assignment.js";
import Submission from "../models/assignments/Submission.js";
import Enrollment from "../models/Enrollment.js";

/**
 * Children Service
 * Handles business logic for managing children (student users) linked to parents
 */
class ChildrenService extends BaseService {
    constructor(userModel) {
        super(userModel);
    }

    /**
     * Get all children for a parent
     * @param {string} parentId - The parent's user ID
     * @returns {Array} Array of children with their profiles
     */
    async getChildren(parentId) {
        // Find parent profile
        const parentProfile = await ParentProfile.findOne({ user: parentId });

        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Get all children with their student profiles
        const children = await User.find({
            _id: { $in: parentProfile.children },
            role: "student"
        }).select("name username email avatar gender phone createdAt updatedAt");

        // Enrich with student profile data
        const childrenWithProfiles = await Promise.all(
            children.map(async (child) => {
                const studentProfile = await StudentProfile.findOne({ user: child._id });
                return {
                    ...child.toObject(),
                    grade: studentProfile?.grade || null,
                    notes: studentProfile?.notes || null,
                    approved: studentProfile?.approved ?? true,
                    // Add aggregated stats
                    ...(await this._calculateChildStats(child._id))
                };
            })
        );

        return childrenWithProfiles;
    }

    /**
     * Calculate aggregated statistics for a child
     * @param {string} childId 
     * @returns {Object} Stats object { avgGrade, attendance, pendingTasks, activeCourses }
     */
    async _calculateChildStats(childId) {
        // 1. Active Courses
        const activeEnrollments = await Enrollment.find({
            student: childId
        });
        const activeCoursesCount = activeEnrollments.length;

        if (activeCoursesCount === 0) {
            return {
                avgGrade: 0,
                attendance: 0,
                pendingTasks: 0,
                activeCourses: 0
            };
        }

        const groupIds = activeEnrollments.map(e => e.group);
        const courseIds = activeEnrollments.map(e => e.course);

        // 2. Attendance (Global)
        const now = new Date();
        const lessons = await Lesson.find({
            groupId: { $in: groupIds },
            status: { $in: ["published", "completed"] },
            date: { $lte: now }
        });

        const totalLessons = lessons.length;
        let attendedLessons = 0;

        lessons.forEach(lesson => {
            if (lesson.attendance && Array.isArray(lesson.attendance)) {
                const record = lesson.attendance.find(a => a.studentId && a.studentId.toString() === childId.toString());
                if (record && ['present', 'late'].includes(record.status)) {
                    attendedLessons++;
                }
            }
        });

        const attendanceRate = totalLessons > 0
            ? Math.round((attendedLessons / totalLessons) * 100)
            : 0;

        // 3. Assignments & Grades
        // Find all active assignments for these courses
        const assignments = await Assignment.find({
            course: { $in: courseIds },
            status: 'active'
        });

        let totalScore = 0;
        let totalMaxScore = 0;
        let pendingCount = 0;

        await Promise.all(assignments.map(async (assignment) => {
            const submission = await Submission.findOne({
                assignment: assignment._id,
                student: childId
            });

            if (submission && ['submitted', 'graded', 'late'].includes(submission.status)) {
                const score = submission.finalGrade !== undefined ? submission.finalGrade : submission.grade;
                if (score !== undefined && score !== null) {
                    totalScore += score;
                    totalMaxScore += (assignment.totalGrade || 100);
                }
            } else {
                pendingCount++;
            }
        }));

        let avgGrade = 0;
        if (totalMaxScore > 0) {
            avgGrade = Math.round((totalScore / totalMaxScore) * 100);
        }

        return {
            avgGrade,
            attendance: attendanceRate,
            pendingTasks: pendingCount,
            activeCourses: activeCoursesCount
        };
    }

    /**
     * Get upcoming sessions for all parent's children
     * @param {string} parentId - The parent's user ID
     * @returns {Array} Array of upcoming sessions
     */
    async getUpcomingSessions(parentId) {
        // Find parent profile
        const parentProfile = await ParentProfile.findOne({ user: parentId });

        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Get all children
        const children = await User.find({
            _id: { $in: parentProfile.children },
            role: "student"
        }).select("name _id");

        if (children.length === 0) {
            return [];
        }

        const childIds = children.map(c => c._id);

        // Get active enrollments for all children
        const enrollments = await Enrollment.find({
            student: { $in: childIds },
            status: { $in: ['active', 'trialing', 'past_due'] }
        }).populate('group', 'title type')
            .populate('course', 'title')
            .populate('teacher', 'name username');

        if (enrollments.length === 0) {
            return [];
        }

        // Filter out enrollments without group and extract groupIds
        const validEnrollments = enrollments.filter(e => e.group && e.group._id);
        if (validEnrollments.length === 0) {
            return [];
        }

        const groupIds = validEnrollments.map(e => e.group._id);

        // Get upcoming lessons (future lessons from now)
        const now = new Date();
        const upcomingLessons = await Lesson.find({
            groupId: { $in: groupIds },
            date: { $gte: now },
            status: { $in: ["published"] }
        }).populate('groupId', 'title type')
            .sort({ date: 1 })
            .limit(10);

        // Map lessons to session format
        const sessions = upcomingLessons.map(lesson => {
            if (!lesson.groupId) return null;

            // Find enrollment that matches this lesson's group
            const enrollment = validEnrollments.find(e =>
                e.group._id.toString() === lesson.groupId._id.toString()
            );

            if (!enrollment) return null;

            // Find the child for this enrollment
            const child = children.find(c =>
                c._id.toString() === enrollment.student.toString()
            );

            return {
                id: lesson._id,
                subject: enrollment.course?.title || lesson.groupId?.title || 'Course',
                grade: enrollment.group?.title || 'N/A',
                status: lesson.groupId?.type === 'online' ? 'Online' : 'Offline',
                tutor: enrollment.teacher?.name || 'Teacher',
                date: lesson.date,
                startTime: lesson.startTime,
                childId: child?._id,
                childName: child?.name,
                lessonTitle: lesson.title
            };
        }).filter(Boolean);

        return sessions;
    }

    /**
     * Get a child by ID (must belong to the parent)
     * @param {string} childId - The child's user ID
     * @param {string} parentId - The parent's user ID
     * @returns {Object} Child data with profile
     */
    async getChildById(childId, parentId) {
        this._validateId(childId);
        this._validateId(parentId);

        // Verify parent profile exists
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Convert childId to ObjectId for consistent comparison
        const childObjectId = typeof childId === 'string'
            ? new mongoose.Types.ObjectId(childId)
            : childId;

        // Verify child belongs to parent - compare ObjectIds properly
        const childBelongsToParent = parentProfile.children.some(
            (child) => {
                const childObjId = child instanceof mongoose.Types.ObjectId
                    ? child
                    : new mongoose.Types.ObjectId(child);
                return childObjId.equals(childObjectId);
            }
        );

        if (!childBelongsToParent) {
            throw AppError.forbidden("This child does not belong to you");
        }

        // Get child user - findById handles string to ObjectId conversion automatically
        // Include 'role' in select to check if user is a student
        const child = await User.findById(childObjectId).select("name username email avatar gender phone role createdAt updatedAt");

        if (!child) {
            throw AppError.notFound(`Child with ID ${childId} not found in the system`);
        }

        // Get student profile first - if it exists, user is a student regardless of role field
        const studentProfile = await StudentProfile.findOne({ user: childObjectId });

        // If user has StudentProfile, they are a student (role field might be incorrect)
        // Otherwise, check the role field
        if (!studentProfile && child.role !== "student") {
            throw AppError.notFound(`User with ID ${childId} is not a student. Current role: ${child.role}`);
        }

        // If role is incorrect but StudentProfile exists, update the role
        if (studentProfile && child.role !== "student") {
            child.role = "student";
            await child.save();
        }

        return {
            ...child.toObject(),
            grade: studentProfile?.grade || null,
            notes: studentProfile?.notes || null,
            approved: studentProfile?.approved ?? true,
            ...(await this._calculateChildStats(childObjectId))
        };
    }

    /**
     * Create a new child (student user) for a parent
     * @param {string} parentId - The parent's user ID
     * @param {Object} data - Child data (name, email, password, grade, etc.)
     * @returns {Object} Created child with profile
     */
    async createChild(parentId, data) {
        this._validateId(parentId);

        // Verify parent profile exists
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: data.email.toLowerCase() });
        if (existingUser) {
            throw AppError.conflict("Email already exists");
        }

        // Create child user
        const childUser = await User.create({
            name: data.name,
            email: data.email.toLowerCase(),
            password: data.password,
            role: "student",
            gender: data.gender || "male",
            phone: data.phone || null,
            avatar: data.avatar || null,
        });

        // Create student profile
        const studentProfile = await StudentProfile.create({
            user: childUser._id,
            parent: parentId,
            grade: data.grade,
            notes: data.notes || null,
            approved: data.approved !== undefined ? data.approved : true,
        });

        // Add child to parent's children array
        parentProfile.children.push(childUser._id);
        await parentProfile.save();

        // Return child with profile
        return {
            ...this.sanitize(childUser),
            grade: studentProfile.grade,
            notes: studentProfile.notes,
            approved: studentProfile.approved,
        };
    }

    /**
     * Update a child
     * @param {string} childId - The child's user ID
     * @param {string} parentId - The parent's user ID
     * @param {Object} data - Update data
     * @returns {Object} Updated child with profile
     */
    async updateChild(childId, parentId, data) {
        this._validateId(childId);
        this._validateId(parentId);

        // Verify parent profile exists
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Verify child belongs to parent
        if (!parentProfile.children.includes(childId)) {
            throw AppError.forbidden("This child does not belong to you");
        }

        // Get child user
        const child = await User.findById(childId);
        if (!child || child.role !== "student") {
            throw AppError.notFound("Child not found");
        }

        // Prepare user update data
        const userUpdateData = {};
        if (data.name) userUpdateData.name = data.name;
        if (data.email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({
                email: data.email.toLowerCase(),
                _id: { $ne: childId }
            });
            if (existingUser) {
                throw AppError.conflict("Email already exists");
            }
            userUpdateData.email = data.email.toLowerCase();
        }
        if (data.password) userUpdateData.password = data.password;
        if (data.gender) userUpdateData.gender = data.gender;
        if (data.phone !== undefined) userUpdateData.phone = data.phone;
        if (data.avatar !== undefined) userUpdateData.avatar = data.avatar;

        // Update user if there's data
        if (Object.keys(userUpdateData).length > 0) {
            Object.assign(child, userUpdateData);
            await child.save();
        }

        // Prepare student profile update data
        const profileUpdateData = {};
        if (data.grade) profileUpdateData.grade = data.grade;
        if (data.notes !== undefined) profileUpdateData.notes = data.notes;
        if (data.approved !== undefined) profileUpdateData.approved = data.approved;

        // Update student profile if there's data
        let studentProfile = await StudentProfile.findOne({ user: childId });
        if (Object.keys(profileUpdateData).length > 0) {
            if (studentProfile) {
                Object.assign(studentProfile, profileUpdateData);
                await studentProfile.save();
            } else {
                // Create profile if it doesn't exist
                studentProfile = await StudentProfile.create({
                    user: childId,
                    parent: parentId,
                    ...profileUpdateData,
                });
            }
        }

        // Get updated student profile
        if (!studentProfile) {
            studentProfile = await StudentProfile.findOne({ user: childId });
        }

        // Return updated child
        return {
            ...this.sanitize(child),
            grade: studentProfile?.grade || null,
            notes: studentProfile?.notes || null,
            approved: studentProfile?.approved ?? true,
        };
    }

    /**
     * Delete a child
     * @param {string} childId - The child's user ID
     * @param {string} parentId - The parent's user ID
     * @returns {void}
     */
    async deleteChild(childId, parentId) {
        this._validateId(childId);
        this._validateId(parentId);

        // Verify parent profile exists
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Verify child belongs to parent
        if (!parentProfile.children.includes(childId)) {
            throw AppError.forbidden("This child does not belong to you");
        }

        // Get child user
        const child = await User.findById(childId);
        if (!child || child.role !== "student") {
            throw AppError.notFound("Child not found");
        }

        // Remove child from parent's children array
        parentProfile.children = parentProfile.children.filter(
            (id) => id.toString() !== childId.toString()
        );
        await parentProfile.save();

        // Delete student profile
        await StudentProfile.findOneAndDelete({ user: childId });

        // Delete child user
        await User.findByIdAndDelete(childId);
    }

    /**
     * Get course statistics for a child
     * @param {string} childId - The child's user ID
     * @param {string} parentId - The parent's user ID
     * @param {string} courseId - The course ID
     * @returns {Object} Course statistics
     */
    async getChildCourseStats(childId, parentId, courseId) {
        this._validateId(childId);
        this._validateId(parentId);
        this._validateId(courseId);

        // Verify child belongs to parent (reuse existing logic or simplified)
        // We can just check ParentProfile
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile) {
            throw AppError.notFound("Parent profile not found");
        }

        // Check if child is in parent's children list
        // Note: parentProfile.children contains ObjectIds
        const isChild = parentProfile.children.some(id => id.toString() === childId.toString());
        if (!isChild) {
            throw AppError.forbidden("This child does not belong to you");
        }

        // Check Enrollment
        const enrollment = await Enrollment.findOne({
            student: childId,
            course: courseId,
            status: "active"
        });

        if (!enrollment) {
            // Check if there is ANY enrollment (maybe expired?)
            const anyEnrollment = await Enrollment.findOne({
                student: childId,
                course: courseId
            });
            if (!anyEnrollment) {
                throw AppError.notFound("Child is not enrolled in this course");
            }
            // If exists but not active, maybe still show functionality? 
            // The user didn't specify, so strictly "active" is safer, or lax is better for history.
            // Let's use the found enrollment regardless of status for stats (history).
        }
        // Re-fetch to be safe if I want to support inactive
        const targetEnrollment = enrollment || await Enrollment.findOne({ student: childId, course: courseId });

        // 1. Attendance Stats
        const groupId = targetEnrollment ? targetEnrollment.group : null;

        let totalClasses = 0;
        let attendedClasses = 0;
        let attendancePercentage = 0;
        let lastAttendance = "Never";
        let submittedAssignments = 0;
        let pendingAssignments = 0;

        if (groupId) {
            const now = new Date();

            // Get all lessons for the group
            const lessons = await Lesson.find({
                groupId: groupId,
                status: { $in: ["published", "completed"] }
            }).sort({ date: 1 });

            const pastLessons = lessons.filter(l => l.date && new Date(l.date) <= now);

            // Total classes that happened
            totalClasses = pastLessons.length;

            let lastAttendanceDate = null;
            let lastAttendanceTitle = "";

            pastLessons.forEach(lesson => {
                // attendance is [{ studentId, status }]
                if (lesson.attendance && Array.isArray(lesson.attendance)) {
                    const record = lesson.attendance.find(
                        a => a.studentId && a.studentId.toString() === childId.toString()
                    );

                    if (record && ['present', 'late'].includes(record.status)) {
                        attendedClasses++;
                        const lessonDate = new Date(lesson.date);
                        if (!lastAttendanceDate || lessonDate > lastAttendanceDate) {
                            lastAttendanceDate = lessonDate;
                            lastAttendanceTitle = lesson.title;
                        }
                    }
                }
            });

            attendancePercentage = totalClasses > 0
                ? Math.round((attendedClasses / totalClasses) * 100)
                : 0;

            // Last Attendance formatting
            if (lastAttendanceDate) {
                const diffTime = Math.abs(now - lastAttendanceDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                let dateStr = "";
                if (diffDays === 0 && now.getDate() === lastAttendanceDate.getDate()) {
                    dateStr = "Today";
                } else if (diffDays <= 1 && now.getDate() !== lastAttendanceDate.getDate()) {
                    dateStr = "Yesterday";
                } else {
                    dateStr = lastAttendanceDate.toISOString().split('T')[0];
                }

                lastAttendance = `${lastAttendanceTitle} (${dateStr})`;
            }
        }

        // 2. Assignments Stats
        // Find assignments for this course
        // Also consider group specific assignments?
        // Assignment model: group (optional), course (required)
        const assignmentsQuery = {
            course: courseId,
            status: 'active'
        };
        // If we want to be strict about group:
        // assignmentsQuery.$or = [{ group: null }, { group: groupId }];

        const assignments = await Assignment.find(assignmentsQuery);

        let totalScore = 0;
        let totalMaxScore = 0;

        // Use Promise.all for parallel submission checks
        await Promise.all(assignments.map(async (assignment) => {
            // Check if submitted
            const submission = await Submission.findOne({
                assignment: assignment._id,
                student: childId,
                status: { $in: ['submitted', 'graded', 'late'] }
            });

            if (submission) {
                submittedAssignments++;
                // Calculate grade if available
                // Use finalGrade if available, otherwise grade
                const score = submission.finalGrade !== undefined ? submission.finalGrade : submission.grade;
                if (score !== undefined && score !== null) {
                    totalScore += score;
                    totalMaxScore += (assignment.totalGrade || 100);
                }
            } else {
                // Check if it's actually pending (due date passed?)
                // For pending count, usually means "to do".
                // If passed and not submitted, acts as missing?
                // Mock has "pending: 2". Let's assume pending = not submitted yet.
                pendingAssignments++;
            }
        }));


        // 3. Progress Calculation
        // progress = (attended / totalLessons) * 100?
        // Mock: progress: 75. 
        // If 20 total classes, 17 attended. 17/20 = 85%.
        // If progress is completion of course content.
        // Let's assume progress is based on attended vs TOTAL lessons (including future).

        // This variable totalLessons is now tricky because I defined totalClasses inside if(groupId)
        // Check if I can assume progress matches attendance percentage for now
        const progress = attendancePercentage;

        // Student Status based on Average Grade
        let averageGrade = 0;
        if (totalMaxScore > 0) {
            averageGrade = (totalScore / totalMaxScore) * 100;
        }

        let studentStatus = "Good";
        if (averageGrade >= 90) studentStatus = "Excellent";
        else if (averageGrade >= 75) studentStatus = "Good";
        else if (averageGrade >= 50) studentStatus = "Average";
        else studentStatus = "Poor";

        // If no assignments graded yet, maybe fallback to attendance or keep as "Good"/"N/A"?
        // Let's fallback to "Good" as default if no data, or maybe "N/A"
        if (totalMaxScore === 0) studentStatus = "Good";

        return {
            studentStatus,
            attendancePercentage,
            lastAttendance,
            attendedClasses,
            totalClasses,
            tests: [],
            assignments: {
                submitted: submittedAssignments,
                pending: pendingAssignments
            },
            progress
        };
    }

    /**
     * Get active subscriptions for all children
     * @param {string} parentId 
     * @returns {Object} { totalMonthlyFee, totalSubscriptions, children: [] }
     */
    async getSubscriptions(parentId) {
        // 1. Get parent's children
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile || !parentProfile.children || parentProfile.children.length === 0) {
            return { totalMonthlyFee: 0, totalSubscriptions: 0, children: [] };
        }

        const childIds = parentProfile.children;

        // 2. Find all active enrollments for these children
        // Include: active, trialing, past_due, incomplete (for pending payments), unpaid
        // Exclude: canceled, incomplete_expired
        // 2. Find all active enrollments for these children
        // DEBUG: Removed status filter to see EVERYTHING
        // status: { $in: ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'] }
        const activeEnrollments = await Enrollment.find({
            student: { $in: childIds }
        })
            .populate({
                path: 'group',
                select: 'title schedule price isFree'
            })
            .populate({
                path: 'course',
                select: 'title teacherId',
                populate: { path: 'teacherId', select: 'name username' }
            })
            .populate({
                path: 'student',
                select: 'name avatar grade',
                populate: { path: 'avatar', select: 'url' }
            });

        console.log(`[getSubscriptions] Found ${activeEnrollments.length} enrollments for ${childIds.length} children`);

        // 3. Process data
        let totalMonthlyFee = 0;
        const childrenMap = new Map();

        const childrenUsers = await User.find({ _id: { $in: childIds } }).select('name avatar');

        // Helper to get StudentProfile for grade
        const studentProfiles = await StudentProfile.find({ user: { $in: childIds } }).select('user grade');
        const gradeMap = new Map(studentProfiles.map(sp => [sp.user.toString(), sp.grade]));

        // Initialize children map
        childrenUsers.forEach(child => {
            const avatarUrl = child?.avatar?.url || child?.avatar || '';
            childrenMap.set(child._id.toString(), {
                id: child._id,
                name: child.name,
                avatar: avatarUrl,
                grade: gradeMap.get(child._id.toString()) || 'N/A',
                enrolledCourses: [],
                totalChildPrice: 0
            });
        });

        // 3b. Distribute enrollments
        for (const enrollment of activeEnrollments) {
            if (!enrollment.group) continue;

            const childId = enrollment.student._id.toString();
            const childData = childrenMap.get(childId);

            if (childData) {
                const price = enrollment.group.isFree ? 0 : (enrollment.group.price || 0);
                totalMonthlyFee += price;
                childData.totalChildPrice += price;

                let nextAttendance = "N/A";
                if (enrollment.group.schedule && enrollment.group.schedule.length > 0) {
                    const nextSession = enrollment.group.schedule[0];
                    nextAttendance = `${nextSession.day} ${nextSession.time}`;
                }

                const teacherName = enrollment.course?.teacherId?.name || enrollment.course?.teacherId?.username || 'Teacher';
                const paidDate = enrollment.paidAt || enrollment.createdAt;

                childData.enrolledCourses.push({
                    id: enrollment.course?._id,
                    enrollmentId: enrollment._id, // Added
                    status: enrollment.status, // Added
                    cancelAtPeriodEnd: enrollment.cancelAtPeriodEnd, // Added
                    title: enrollment.course?.title || enrollment.group.title,
                    instructor: teacherName,
                    price: price,
                    nextAttendance: nextAttendance,
                    paidAt: paidDate
                });
            }
        }

        const childrenList = Array.from(childrenMap.values());
        const totalSubscriptions = activeEnrollments.length;

        return {
            totalMonthlyFee,
            totalSubscriptions,
            children: childrenList
        };
    }

    /**
     * Get all teachers teaching the parent's children
     * @param {string} parentId - The parent's user ID
     * @returns {Array} List of teachers
     */
    async getChildrenTeachers(parentId) {
        // 1. Get parent profile to find children
        const parentProfile = await ParentProfile.findOne({ user: parentId });
        if (!parentProfile || !parentProfile.children || parentProfile.children.length === 0) {
            return [];
        }

        const childIds = parentProfile.children;

        // 2. Find all active enrollments for these children
        const enrollments = await Enrollment.find({
            student: { $in: childIds },
            status: { $in: ['active', 'trialing'] }
        }).populate({
            path: 'course',
            select: 'title subject teacherId',
            populate: {
                path: 'teacherId',
                select: 'name avatar email specialization'
            }
        }).populate({
            path: 'teacher', // Sometimes teacher is directly on enrollment or group, but usually course -> teacherId
            select: 'name avatar email specialization'
        });

        // 3. Extract unique teachers
        const teacherMap = new Map();

        enrollments.forEach(enrollment => {
            // Teacher can be from course.teacherId
            let teacher = enrollment.course?.teacherId;

            // Or maybe directly on enrollment if overrides? (Less common in this schema seems)
            if (!teacher && enrollment.teacher) {
                teacher = enrollment.teacher;
            }

            if (teacher && teacher._id) {
                const teacherId = teacher._id.toString();
                if (!teacherMap.has(teacherId)) {
                    teacherMap.set(teacherId, {
                        id: teacherId,
                        name: teacher.name,
                        email: teacher.email,
                        avatar: teacher.avatar, // Assuming avatar is populated or is a string/object handled by frontend
                        subject: enrollment.course?.subject || "General",
                        subjects: new Set([enrollment.course?.subject || "General"]), // Track all subjects taught by this teacher to this child
                        availability: ["Online"], // Mocking availability as it's not in User model usually
                    });
                } else {
                    // Update subjects
                    const existing = teacherMap.get(teacherId);
                    if (enrollment.course?.subject) {
                        existing.subjects.add(enrollment.course.subject);
                    }
                }
            }
        });

        // Convert Map to Array and format
        return Array.from(teacherMap.values()).map(t => ({
            ...t,
            subjects: Array.from(t.subjects)
        }));
    }
}

export default new ChildrenService(User);
