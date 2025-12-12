import ParentProfile from "../models/users/ParentProfile.js";
import mongoose from "mongoose";
import StudentProfile from "../models/users/StudentProfile.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/users/User.js";
import AppError from "../utils/app.error.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./helpers/cloudinary.service.js";

class UserService extends BaseService {
  constructor(model) {
    super(model);
  }
  /* --- --- --- User Profile --- --- --- */
  /** Get current user profile
   * @param {string} userId - The ID of the user
   * @returns {object} The user profile
   * @throws {AppError} If the user is not found
   */
  async getMe(userId, role) {
    let query = this.model.findById(userId);

    if (role !== "admin") query.populate(`${role}Data`);

    let user = await query.lean();
    if (!user) throw AppError.notFound(`User with id ${userId} not found`);

    user = { ...user, ...user[role + "Data"] };
    user = this.sanitize(user);
    return user;
  }

  /** Upload user avatar
   * @param {string} userId - The ID of the user
   * @param {object} avatarFile - The avatar file to upload
   * @returns {object} The uploaded avatar details
   */
  async uploadAvatar(userId, avatarFile) {
    let avatar = null;
    let user = await this.findById(userId);
    avatar = user.avatar || null;

    if (avatarFile) {
      const uploadResult = await cloudinaryService.upload(
        avatarFile,
        "users/avatars/",
        { resource_type: "image" }
      );

      if (avatar.publicId && uploadResult.publicId) {
        await cloudinaryService.delete(avatar.publicId, avatar.type);
      }

      avatar = {
        ...uploadResult,
      };
    }
    return avatar;
  }

  /** delete user avatar
   * @param {string} userId - The ID of the user
   */
  async deleteAvatar(userId) {
    let user = await this.findById(userId);
    let avatar = user.avatar || null;
    if (avatar?.publicId) {
      await cloudinaryService.delete(avatar.publicId, avatar.type);
      avatar = null;
      await this.updateById(userId, { avatar });
    }
  }

  /** Update user profile
   * @param {string} userId - The ID of the user
   * @param {object} payload - The profile data to update
   * @returns {object} The updated user profile
   * @throws {AppError} If no valid fields are provided or user is not found
   */
  async updateMe(userId, data = {}, avatarFile) {
    const allowedFields = ["name", "username", "email", "phone", "socialMedia"];
    let avatar = null;
    if (avatarFile) {
      avatar = await this.uploadAvatar(userId, avatarFile);
    }

    let updated = {};
    Object.keys(data).forEach((key) => {
      if (allowedFields.includes(key)) {
        updated[key] = data[key];
      }
    });
    if (avatar) updated.avatar = avatar;
    if (Object.keys(updated).length === 0 && !avatar)
      throw AppError.badRequest("No valid fields provided");

    const updatedUser = await this.updateById(
      userId,
      { ...updated },
      { new: true }
    );

    return this.sanitize(updatedUser);
  }

  async findAll(filters, options) {
    const { role, subject, gradeLevel, name } = filters;
    const { page = 1, limit = 10 } = options;

    const filterQuery = {};

    if (role) filterQuery.role = role;
    if (role === "teacher" && subject) filterQuery.subject = subject;
    if (role === "student" && gradeLevel) filterQuery.gradeLevel = gradeLevel;
    if (name) filterQuery.name = { $regex: new RegExp(name, "i") };

    const query = this.model.find(filterQuery);

    if (role && role !== "admin") {
      query.populate(`${role}Data`);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    query.skip(skip).limit(limitNum).sort({ createdAt: -1 });

    if (role !== "admin")
      query
        .populate("teacherData")
        .populate("studentData")
        .populate("parentData");


    let [users, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(filterQuery),
    ]);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: { users },
    };
  }

  /* --- --- --- PASSWORD MANAGEMENT --- --- --- */

  /** Change password for a user
   * @param {string} userId - The ID of the user
   * @param {string} currentPassword - The current password of the user
   * @param {string} newPassword - The new password to set
   * @throws {AppError} If the user is not found or the current password is incorrect
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.findById(userId, "+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw AppError.unauthorized("Current password is incorrect");

    user.password = newPassword;
    await user.save();
  }

  /** Get children for current user (Parent)
   * @param {string} userId - ID of the parent
   * @param {string} courseId - Optional course ID to check enrollment
   */
  async getChildren(userId, courseId) {
    // 1. Get Parent Profile
    const parentProfile = await ParentProfile.findOne({ user: userId }).populate({
      path: 'children',
      select: 'name avatar username'
    });

    if (!parentProfile || !parentProfile.children) {
      return [];
    }

    // 2. Hydrate children with Student Profile (Grade) & Enrollment Status
    const childrenData = await Promise.all(parentProfile.children.map(async (child) => {
      const studentProfile = await StudentProfile.findOne({ user: child._id });

      let enrollmentStatus = null;
      if (courseId) {
        const enrollment = await Enrollment.findOne({
          student: child._id,
          course: courseId,
          status: 'active'
        });
        enrollmentStatus = !!enrollment;
      }

      return {
        _id: child._id,
        name: child.name,
        username: child.username,
        avatar: child.avatar,
        grade: studentProfile?.grade,
        isEnrolled: enrollmentStatus
      };
    }));

    return childrenData;
  }
  /** Get public teachers with filtering (Aggregation)
   * @param {object} filters - { subject, rating, search, minPrice, maxPrice }
   * @param {object} options - { page, limit }
   */
  async getPublicTeachers(filters, options) {
    const { subject, rating, search } = filters; // rating is minRating
    const { page = 1, limit = 12 } = options;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build Aggregation Pipeline
    const pipeline = [];

    // 1. Match only teachers
    pipeline.push({ $match: { role: 'teacher' } });

    // 2. Lookup TeacherProfile
    pipeline.push({
      $lookup: {
        from: 'teacherprofiles', // Ensure collection name matches (plural, lowercase usually)
        localField: '_id',
        foreignField: 'user',
        as: 'teacherData'
      }
    });

    // 3. Unwind (preserveNullAndEmptyArrays: false -> we only want users WITH a profile)
    pipeline.push({ $unwind: '$teacherData' });

    // 4. Filter by Search (Name or Username)
    if (search) {
      const regex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: regex } },
            { username: { $regex: regex } }
          ]
        }
      });
    }

    // 5. Filter by Subject (in TeacherProfile)
    if (subject) {
      // Handle array or single string
      const subjects = Array.isArray(subject) ? subject : [subject];
      pipeline.push({
        $match: {
          'teacherData.subjects': { $in: subjects }
        }
      });
    }

    // 6. Filter by Rating (in TeacherProfile) -- rating is "4" (starts from 4)
    if (rating) {
      // e.g. rating="4" -> averageRating >= 4
      // If sorting by "top rated", user might pass sort param. Here assume filter.
      pipeline.push({
        $match: {
          'teacherData.averageRating': { $gte: Number(rating) }
        }
      });
    }

    // 7. Facet for Pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: 'courses',
              let: { teacherId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$teacherId', '$$teacherId'] }, status: 'published' } },
                { $count: 'count' }
              ],
              as: 'coursesCountArr'
            }
          },
          {
            $lookup: {
              from: 'groups',
              let: { teacherId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$teacherId', '$$teacherId'] } } },
                { $count: 'count' }
              ],
              as: 'groupsCountArr'
            }
          },
          {
            $addFields: {
              totalCourses: { $ifNull: [{ $arrayElemAt: ['$coursesCountArr.count', 0] }, 0] },
              totalGroups: { $ifNull: [{ $arrayElemAt: ['$groupsCountArr.count', 0] }, 0] }
            }
          },
          // Project only necessary fields (Flattening)
          {
            $project: {
              _id: 1,
              name: 1,
              username: 1,
              avatar: 1,
              // Flatten Teacher Data
              subjects: '$teacherData.subjects',
              bio: '$teacherData.bio',
              averageRating: '$teacherData.averageRating',
              totalRatings: '$teacherData.totalRatings',
              yearsOfExperience: '$teacherData.yearsOfExperience',
              videoIntro: '$teacherData.videoIntro',
              qualifications: '$teacherData.qualifications',
              socialMedia: 1,
              emailVerified: 1, // Taken from root User document
              totalCourses: 1,
              totalGroups: 1
            }
          }
        ]
      }
    });

    const result = await this.model.aggregate(pipeline);

    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const users = result[0].data;

    return {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: { users },
      // NOTE: We could also return aggregated filters (available subjects) here if needed later
    };
  }

  /** Get User by Username (Public Profile)
   * @param {string} username
   */
  async getUserByUsername(username) {
    const user = await this.model.findOne({ username }).lean();
    if (!user) throw AppError.notFound(`User @${username} not found`);

    // Populate based on role
    let profileData = {};
    if (user.role === 'teacher') {
      profileData = await mongoose.model('TeacherProfile').findOne({ user: user._id }).lean();

      // [NEW] Count Published Courses
      const totalCourses = await mongoose.model('Course').countDocuments({ teacherId: user._id, status: 'published' });

      // [NEW] Count Active Count
      const totalGroups = await mongoose.model('Group').countDocuments({ teacherId: user._id });

      profileData.totalCourses = totalCourses;
      profileData.totalGroups = totalGroups;

      // [NEW] Populate Reviews (Limit 10 for now)
      // Note: We need to use model.populate on the user object or separate query because we used .lean() on findOne
      // But since we have user._id, let's fetch reviews separately to key them
      const reviews = await mongoose.model('Review').find({ target: user._id, targetModel: 'User' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name avatar') // Populate reviewer info
        .lean();

      profileData.reviews = reviews;

    } else if (user.role === 'student') {
      profileData = await mongoose.model('StudentProfile').findOne({ user: user._id }).lean();
    }
    // Parent profile might not be public, but if needed:
    // else if (user.role === 'parent') ...

    // Flatten and ensure User ID is preserved
    const fullProfile = {
      ...user,
      ...profileData,
      _id: user._id, // EXPLICITLY preserve User ID
      profileId: profileData._id, // Keep Profile ID if needed
      // sanitize sensitive fields
      password: undefined,
      __v: undefined,
      provider: undefined,
      providerId: undefined,
      linkedProviders: undefined,
      otp: undefined,
      otpExpiry: undefined,
      payoutAccount: undefined, // Sensitive
      balance: undefined,       // Sensitive
      pendingPayouts: undefined, // Sensitive
      totalEarnings: undefined   // Sensitive
    };

    // Remove null/undefined
    Object.keys(fullProfile).forEach(key => fullProfile[key] === undefined && delete fullProfile[key]);

    return fullProfile;
  }
}

export default new UserService(User);
