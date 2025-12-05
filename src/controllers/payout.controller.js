import asyncHandler from "express-async-handler";
import payoutService from "../services/payout.service.js";
import AppError from "../utils/app.error.js";

class PayoutController {
  constructor(service) {
    this.service = service;
  }

  requestPayout = asyncHandler(async (req, res) => {
    if (req.user.role !== "teacher") {
      throw AppError.forbidden("Only teachers can request payouts");
    }

    const { amount, note } = req.body;
    const teacherId = req.user._id || req.user.id;
    const payout = await this.service.requestPayout(teacherId, amount, note);

    res.status(201).json({
      success: true,
      message: "Payout request submitted successfully",
      data: { payout },
    });
  });

  getMyPayouts = asyncHandler(async (req, res) => {
    if (req.user.role !== "teacher") {
      throw AppError.forbidden("Only teachers can view their payouts");
    }

    const teacherId = req.user._id || req.user.id;
    const payouts = await this.service.getTeacherPayouts(teacherId);
    res.status(200).json({
      success: true,
      message: "Payouts fetched successfully",
      count: payouts.length,
      data: {payouts},
    });
  });

  adminList = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      throw AppError.forbidden("Only admins can list payouts");
    }

    const payouts = await this.service.getAll({ status: req.query.status });
    res.status(200).json({
      success: true,
      count: payouts.length,
      payouts,
    });
  });

  adminUpdate = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      throw AppError.forbidden("Only admins can update payouts");
    }

    const adminId = req.user._id || req.user.id;
    const payout = await this.service.updateStatus(req.params.payoutId, adminId, req.body);

    res.status(200).json({
      success: true,
      payout,
    });
  });
}

export default new PayoutController(payoutService);


