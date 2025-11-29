import asyncHandler from "express-async-handler";
import UserService from "../services/user.service.js";

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  /** Get current user profile */
  getMe = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const user = await this.userService.getMe(userId);
    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /** Update user profile */
  updateMe = asyncHandler(async (req, res, next) => {
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
  uploadAvatar = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const file = req.file ? req.file : null;

    const avatar = await this.userService.uploadAvatar(userId, file);

    res.status(200).json({
      success: true,
      data: { avatar },
    });
  });
}

export default new UserController(UserService);
