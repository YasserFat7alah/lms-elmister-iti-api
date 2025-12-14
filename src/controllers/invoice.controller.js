import Invoice from "../models/financial/Invoice.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";
import Enrollment from "../models/Enrollment.js";

// @desc    Get all invoices (Admin)
// @route   GET /api/v1/invoices
// @access  Private/Admin
export const getAllInvoices = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, search, status, sort } = req.query;

    const query = {};

    // Search by Invoice ID or Subscription ID
    if (search) {
        query.$or = [
            { stripeInvoiceId: { $regex: search, $options: "i" } },
            { stripeSubscriptionId: { $regex: search, $options: "i" } },
        ];
    }

    // Filter by Status
    if (status && status !== "all") {
        query.status = status;
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default: Newest first
    if (sort) {
        const [key, order] = sort.split(":");
        sortOption = { [key]: order === "desc" ? -1 : 1 };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
        Invoice.find(query)
            .populate({
                path: "enrollment",
                select: "student course",
                populate: [
                    { path: "student", select: "name email avatar" },
                    { path: "course", select: "title" },
                ],
            })
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Invoice.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        count: invoices.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        invoices,
    });
});
