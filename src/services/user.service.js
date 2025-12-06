import User from "../models/users/User.js";
import AppError from "../utils/app.error.js";
import BaseService from "./base.service.js";
import cloudinaryService from "./cloudinary.service.js";

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
    const allowedFields = ["name", "username", "email", "phone"];
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
}

export default new UserService(User);
