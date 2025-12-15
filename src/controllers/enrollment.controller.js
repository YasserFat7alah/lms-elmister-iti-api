import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";
import enrollmentService from "../services/subscriptions/enrollment.service.js";
import ParentProfile from "../models/users/ParentProfile.js";
import mongoose from "mongoose";

class EnrollmentController {
  constructor(service) {
    this.service = service;
  }

  /** Parent enrolls one of their students into a group (Stripe subscription) */
  enroll = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "parent") {
      throw AppError.forbidden("Only parents can enroll students into groups");
    }

    const { studentId } = req.body;
    const { groupId } = req.params;

    if (!studentId) throw AppError.badRequest("Student ID is required for enrollment");
    if (!groupId) throw AppError.badRequest("Group ID is required");

    const data = await this.service.subscribe(user, studentId, groupId);

    res.status(201).json({
      success: true,
      message: "Enrollment initiated. Complete the payment to activate.",
      data,
    });
  });

  /** List enrollments for current user (parent or student) */
  listMine = asyncHandler(async (req, res) => {
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    let enrollments = [];

    if (role === 'student') {
      enrollments = await this.service.listByStudent(userId);
    } else if (role === 'parent') {
      enrollments = await this.service.listByParent(userId);
    } else {
      enrollments = [];
    }

    res.status(200).json({
      success: true,
      message: "Enrollments fetched successfully",
      count: enrollments.length,
      data: enrollments,
    });
  });

  /** Get enrollments for a specific student (parent viewing their child's enrollments) */
  getByStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const parentId = req.user._id || req.user.id;

    // Verify user is a parent
    if (req.user.role !== "parent") {
      throw AppError.forbidden("Only parents can view student enrollments");
    }

    // Verify the student belongs to this parent
    const parentProfile = await ParentProfile.findOne({ user: parentId });

    if (!parentProfile) {
      throw AppError.notFound("Parent profile not found");
    }

    // Check if student belongs to parent - use proper ObjectId comparison
    const studentObjectId = typeof studentId === 'string'
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    const studentBelongsToParent = parentProfile.children.some(
      (child) => {
        const childObjId = child instanceof mongoose.Types.ObjectId
          ? child
          : new mongoose.Types.ObjectId(child);
        return childObjId.equals(studentObjectId);
      }
    );

    if (!studentBelongsToParent) {
      throw AppError.forbidden("You can only view enrollments for your own children");
    }

    const enrollments = await this.service.listByStudent(studentId);

    res.status(200).json({
      success: true,
      message: "Student enrollments fetched successfully",
      count: enrollments.length,
      data: enrollments,
    });
  });

  /** Get all enrollments (Admin) */
  getAll = asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const result = await this.service.findAllEnrollments(filter, { page, limit });

    res.status(200).json({
      success: true,
      data: result
    });
  });

  /** Parent cancels their enrollment (at period end) 
   * @route /api/v1/enrollments/:enrollmentId/cancel
   * @returns {Enrollment}
  */
  cancel = asyncHandler(async (req, res) => {
    // Parent or Admin can cancel
    if (req.user.role !== "parent" && req.user.role !== "admin") {
      throw AppError.forbidden("Only parents or admins can cancel enrollments");
    }

    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const enrollment = await this.service.cancel(userId, req.params.enrollmentId, role);

    res.status(200).json({
      success: true,
      message:
        enrollment.cancelAtPeriodEnd === true
          ? "Enrollment will be cancelled at the end of the billing period."
          : "Enrollment cancelled.",
      data: {
        enrollment,
      }
    });
  });

  /** Renew an enrollment (remove cancel_at_period_end) */
  renew = asyncHandler(async (req, res) => {
    if (req.user.role !== "parent" && req.user.role !== "admin") {
      throw AppError.forbidden("Only parents or admins can renew enrollments");
    }

    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    const enrollment = await this.service.renew(userId, req.params.enrollmentId, role);

    res.status(200).json({
      success: true,
      message: "Subscription renewed successfully. It will continue after the current period.",
      data: {
        enrollment,
      }
    });
  });

  /** Admin: Update status */
  updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { enrollmentId } = req.params;

    const updated = await this.service.updateStatus(enrollmentId, status);

    res.status(200).json({
      success: true,
      data: updated
    });
  });

  /** Admin: Delete enrollment */
  adminDelete = asyncHandler(async (req, res) => {
    await this.service.adminDelete(req.params.enrollmentId);

    res.status(200).json({
      success: true,
      message: "Enrollment deleted successfully"
    });
  });

  /** Stripe webhook (raw body) */
  handleStripeWebhook = async (req, res) => {
    const signature = req.headers["stripe-signature"];
    try {
      const event = this.service.constructStripeEvent(signature, req.body);
      await this.service.handleStripeEvent(event);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error.message);
      res.status(400).json({ error: error.message });
    }
  };
}

export default new EnrollmentController(enrollmentService);


