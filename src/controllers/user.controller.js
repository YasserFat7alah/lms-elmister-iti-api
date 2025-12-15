import asyncHandler from "express-async-handler";
import UserService from "../services/user.service.js";

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  /** Get current user profile */
  getMe = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const user = await this.userService.getMe(userId, role);
    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /** Update user profile */
  updateMe = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = req.body;
    const file = req.file ? req.file : null;

    const updatedUser = await this.userService.updateMe(
      userId,
      data,
      file
    );

    res.status(200).json({
      success: true,
      data: { user: updatedUser },
    });
  });

  /** Upload user avatar */
  uploadAvatar = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const file = req.file ? req.file : null;

    const avatar = await this.userService.uploadAvatar(userId, file);

    res.status(200).json({
      success: true,
      data: { avatar },
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const { role, subject, name, gradeLevel } = req.query;
    const { page, limit } = req.query;

    // const userId = req.user.id;
    // const userRole = req.user.role;
    const users = await this.userService.findAll({ role, subject, name, gradeLevel }, { page, limit });
    res.status(200).json({
      success: true,
      data: { users },
    });
  });

  /** Admin: Delete user */
  deleteUser = asyncHandler(async (req, res) => {
    await this.userService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  });

  /** Admin: Update user */
  updateUser = asyncHandler(async (req, res) => {
    const updatedUser = await this.userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: { user: updatedUser } });
  });

  /** Get Public Teachers (Filtered & Paginated) */
  getPublicTeachers = asyncHandler(async (req, res) => {
    // Extract filters from Query
    const { subject, rating, search, minPrice, maxPrice } = req.query;
    const { page, limit } = req.query;

    // Pass to Service
    const result = await this.userService.getPublicTeachers(
      { subject, rating, search, minPrice, maxPrice },
      { page, limit }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  });

  /** Get Public User Profile by Username or Email */
  getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params; // Can be username or email
    const user = await this.userService.getUserByUsername(username);

    res.status(200).json({
      success: true,
      data: { user }
    });
  });

  getMyChildren = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { courseId } = req.query;


    const children = await this.userService.getChildren(userId, courseId);

    res.status(200).json({
      success: true,
      data: { children }
    });
  });
}

export default new UserController(UserService);
