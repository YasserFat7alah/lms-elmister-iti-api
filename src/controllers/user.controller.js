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
    const { page = 1, limit = 10 } = req.query;
    const { name, email, role } = req.query;
    const users = await this.userService.findAll({ name, email, role }, '', '', { page, limit });
    res.status(200).json({
      success: true,
      data: { users },
    });
  });
}

export default new UserController(UserService);
