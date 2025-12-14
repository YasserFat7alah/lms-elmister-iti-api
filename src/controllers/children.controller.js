import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error.js";
import childrenService from "../services/children.service.js";

/**
 * Children Controller
 * Handles HTTP requests related to children management
 * Methods:
 * - getChildren: Get all children for the authenticated parent
 * - getChildById: Get a specific child by ID
 * - createChild: Create a new child
 * - updateChild: Update a child
 * - deleteChild: Delete a child
 */
class ChildrenController {
    constructor(service) {
        this.childrenService = service;
    }

    /**
     * Get all children for the authenticated parent
     * @route GET /api/v1/children
     * @access Private (parent)
     */
    getChildren = asyncHandler(async (req, res) => {
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access children");
        }

        const children = await this.childrenService.getChildren(parentId);

        res.status(200).json({
            success: true,
            message: "Children fetched successfully",
            data: children,
        });
    });

    /**
     * Get a child by ID
     * @route GET /api/v1/children/:id
     * @access Private (parent)
     */
    getChildById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access children");
        }

        const child = await this.childrenService.getChildById(id, parentId);

        res.status(200).json({
            success: true,
            message: "Child fetched successfully",
            data: child,
        });
    });

    /**
     * Create a new child
     * @route POST /api/v1/children
     * @access Private (parent)
     */
    createChild = asyncHandler(async (req, res) => {
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can create children");
        }

        const child = await this.childrenService.createChild(parentId, req.body);

        res.status(201).json({
            success: true,
            message: "Child created successfully",
            data: child,
        });
    });

    /**
     * Update a child
     * @route PUT /api/v1/children/:id
     * @access Private (parent)
     */
    updateChild = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can update children");
        }

        const child = await this.childrenService.updateChild(id, parentId, req.body);

        res.status(200).json({
            success: true,
            message: "Child updated successfully",
            data: child,
        });
    });

    /**
     * Delete a child
     * @route DELETE /api/v1/children/:id
     * @access Private (parent)
     */
    deleteChild = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can delete children");
        }

        await this.childrenService.deleteChild(id, parentId);

        res.status(200).json({
            success: true,
            message: "Child deleted successfully",
        });
    });

    /**
     * Get course statistics for a child
     * @route GET /api/v1/children/:childId/courses/:courseId/stats
     * @access Private (parent)
     */
    getChildCourseStats = asyncHandler(async (req, res) => {
        const { childId, courseId } = req.params;
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access child statistics");
        }

        const stats = await this.childrenService.getChildCourseStats(childId, parentId, courseId);

        res.status(200).json({
            success: true,
            message: "Child course statistics fetched successfully",
            data: stats,
        });
    });

    /**
     * Get upcoming sessions for all children
     * @route GET /api/v1/children/upcoming-sessions
     * @access Private (parent)
     */
    getUpcomingSessions = asyncHandler(async (req, res) => {
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access upcoming sessions");
        }

        const sessions = await this.childrenService.getUpcomingSessions(parentId);

        res.status(200).json({
            success: true,
            message: "Upcoming sessions fetched successfully",
            data: sessions,
        });
    });

    /**
     * Get active subscriptions
     * @route GET /api/v1/children/subscriptions
     * @access Private (parent)
     */
    getSubscriptions = asyncHandler(async (req, res) => {
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access subscriptions");
        }

        const subscriptions = await this.childrenService.getSubscriptions(parentId);

        res.status(200).json({
            success: true,
            message: "Subscriptions fetched successfully",
            data: subscriptions,
        });
    });

    /**
     * Get teachers for parent's active children courses
     * @route GET /api/v1/children/teachers
     * @access Private (parent)
     */
    getChildrenTeachers = asyncHandler(async (req, res) => {
        const parentId = req.user.id;

        // Verify user is a parent
        if (req.user.role !== "parent") {
            throw AppError.forbidden("Only parents can access teachers");
        }

        const teachers = await this.childrenService.getChildrenTeachers(parentId);

        res.status(200).json({
            success: true,
            message: "Teachers fetched successfully",
            data: teachers,
        });
    });
}

export default new ChildrenController(childrenService);

