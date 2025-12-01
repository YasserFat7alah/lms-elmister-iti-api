import asyncHandler from "express-async-handler";
import AppError from "../utils/app.error";

class GroupController {
    constructor(groupService) {
        this.groupService = groupService; 
    }

    /**
     * Create a new group
     * @route POST /api/v1/groups
    */

    createGroup = asyncHandler(async (req, res) => {
        const group = await this.groupService.createGroup(req.body);

        res.status(201).json({
            success: true,
            data: group
        });
    })

    /**
     * Get all groups (with pagination and filters)
     * @route Get /api/v1/groups
    */
    getAllGroups = asyncHandler(async (req, res) => {
        const data = await this.groupService.getGroups(req.query);

        res.status(200).json({
            success: true,
            ...data
        });
    })

    /**
     * Get a Group by ID
     * @route GET /api/v1/groups/:id
    */
    getGroupById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (!id) {
            throw AppError.badRequest("Group ID is required");
        }
        const group = await this.groupService.getGroupById(id);

        res.status(200).json({
            success: true,
            data: group
        });
    })
    /**
     * Update a Group by ID
     * @route PATCH /api/v1/groups/:id
    */
    updateGroupById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updatedGroup = await this.groupService.updateGroupById(id, req.body);
        res.status(200).json({
            success: true,
            data: updatedGroup
        });
    })

    /**
     * Delete a Group by ID
     * @route DELETE /api/v1/groups/:id
    */
    deleteGroupById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await this.groupService.deleteGroupById(id);
        res.status(200).json({
            success: true,
            ...result
        });

    })


}

export default  GroupController;