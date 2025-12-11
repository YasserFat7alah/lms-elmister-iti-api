import asyncHandler from 'express-async-handler';
import adminService from "../../services/users/admin.service.js";



class AdminController {
  constructor(service) {
    this.service = service;
  }

  /** Get dashboard statistics */
  getDashboard = asyncHandler(async (req, res) => {
    const role = req.user.role;
    const id = req.user.id;
    let stats = {};

    // Validate role
    if (role !== 'admin')
      return res.status(403).json({
        success: false,
        message: "Dashboard access denied - only admins can view this"
      });

    // Get Statistics
    stats = await this.service.getDashboard();

    res.status(200).json({
      success: true,
      data: stats
    });
  });

}


export default new AdminController(adminService);