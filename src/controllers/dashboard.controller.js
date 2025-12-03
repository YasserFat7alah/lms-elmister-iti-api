import asyncHandler from "express-async-handler";
import dashboardService from "../services/dashboard.service.js";

class DashboardController {
  /** Get teacher dashboard
   * @route GET /api/v1/dashboard/teacher
   * @access Private Teacher
   */
  teacherDashboard = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    const stats = await dashboardService.getTeacherDashboard(teacherId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /** Get student dashboard
   * @route GET /api/v1/dashboard/student
   * @access Private Student
   */
  studentDashboard = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const stats = await dashboardService.getStudentDashboard(studentId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /** Get parent dashboard
   * @route GET /api/v1/dashboard/parent
   * @access Private Parent
   */
  parentDashboard = asyncHandler(async (req, res) => {
    const parentId = req.user.id;
    const stats = await dashboardService.getParentDashboard(parentId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /** Get admin dashboard
   * @route GET /api/v1/dashboard/admin
   * @access Private Admin
   */
  adminDashboard = asyncHandler(async (req, res) => {
    const stats = await dashboardService.getAdminDashboard();

    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export default new DashboardController();

