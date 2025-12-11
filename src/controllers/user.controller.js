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

  getMyChildren = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { courseId } = req.query;
    console.log("DEBUG: getMyChildren called for user:", userId);
    console.log("DEBUG: req.user:", req.user);

    const children = await this.userService.getChildren(userId, courseId);

    res.status(200).json({
      success: true,
      data: { children }
    });
  });
}

export default new UserController(UserService);
