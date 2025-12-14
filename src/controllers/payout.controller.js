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
      data: { payouts },
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
    const { status, note } = req.body;
    const payout = await this.service.updateStatus(req.params.payoutId, adminId, status, note);

    res.status(200).json({
      success: true,
      payout,
    });
  });

  /* --- --- --- STRIPE ONBOARDING --- --- --- */

  onboard = asyncHandler(async (req, res) => {
    const teacherId = req.user._id || req.user.id;
    const accountId = await this.service.createConnectAccount(teacherId, req.user.email);
    const link = await this.service.createAccountLink(accountId);

    res.status(200).json({
      success: true,
      url: link
    });
  });

  checkOnboarding = asyncHandler(async (req, res) => {
    const teacherId = req.user._id || req.user.id;
    const status = await this.service.getOnboardingStatus(teacherId);
    res.status(200).json({
      success: true,
      status
    });
  });
}

export default new PayoutController(payoutService);


