import BaseService from "./base.service.js";
import Group from "../models/Group.js";
import AppError from "../utils/app.error.js";

class GroupService extends BaseService {
    constructor(model, courseModel) {
        super(model);
        this.courseModel = courseModel;
    }

    /**
     * Creates a new group and adds it to the course's groups array
     * @param {Object} data - The group data.
     * @throws {AppError} If capacity is not greater than 0 or starting date is in the past.
     * @returns {Promise<Group>} The newly created group.
     */
    async createGroup(data) {

        if (data.capacity <= 0) {
            throw AppError.badRequest("Capacity must be greater than 0");
        }

        if (data.startingDate && new Date(data.startingDate) < new Date()) {
            throw AppError.badRequest("Starting date cannot be in the past");
        }

        const group = await super.create(data);

        // Add group to course's groups array
        await this.courseModel.findByIdAndUpdate(
            data.courseId,
            { $push: { groups: group._id } }
        );

        return group;
    }


    /**
     * Get groups by given filters and options
     * @param {Object} filters - Filter objects
     * @param {Object} options - Options for pagination
     * @return {Promise<Array<Group>>} - Array of Group objects
     */
    async getGroups(filters, options) {
        const { courseId, teacherId, day, opened = false } = filters;
        const { page = 1, limit = 10 } = options;

        const queryObj = {};

        if (courseId) queryObj.courseId = courseId;

        if (teacherId) queryObj.teacherId = teacherId;

        if (day) queryObj['schedule.day'] = day.toLowerCase();

        if (opened === 'true' || opened === true) {
            queryObj.$expr = { $lt: ["$studentsCount", "$capacity"] };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [groups, total] = await Promise.all([
            this.model
                .find(queryObj)
                .skip(skip)
                .limit(limitNum)
                .populate('courseId', 'title')
                .populate('teacherId', 'name username')
                .populate('students', 'name username email')
                .sort({ startingDate: 1 }),
            super.count(queryObj)
        ]);
        return {
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            data: groups
        };
    }

    /**
     * Retrieve a group by ID
     * @param {string} GroupId - The ID of the group to retrieve
     * @returns {Promise<Group>} - The retrieved group
     */
    async getGroupById(GroupId) {
        if (!GroupId) {
            throw AppError.badRequest('Group ID is required');
        }
        const group = await this.model
            .findById(GroupId)
            .populate("courseId", "title")
            .populate("teacherId", "name username")
            .populate("students", "name username email");

        if (!group) {
            throw AppError.notFound("Group not found");
        }

        return group;
    }


    /**
     * Update a group by ID
     * @param {string} id - The ID of the group to update
     * @param {Object} data - The group data to update
     * @returns {Promise<Group>} - The updated group
     * @throws {badRequest} - If capacity is less than current students count
     */
    async updateGroupById(id, data, userId, userRole) {
        const group = await super.findById(id);

        if (!group) {
            throw AppError.notFound("Group not found");
        }
        // Prevent editing if the teacher isnt the owner
        if (userRole === 'teacher' && group.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only update your own groups");
        }
        // Prevent reducing capacity below current students count
        if (data.capacity && data.capacity < group.studentsCount) {
            throw AppError.badRequest("Capacity Cannot be less than current students count");
        }

        Object.keys(data).forEach((key) => {
            group[key] = data[key];
        });

        await group.save();

        return group;
    }


    /**
     * Delete a group by ID
     * @param {string} id - The ID of the group to delete
     * @returns {Promise<Object>} - Object containing a success message
     * @throws {badRequest} - If the group has already enrolled students
     */
    async deleteGroupById(id, userId, userRole) {
        const group = await super.findById(id);

        if (!group) {
            throw AppError.notFound("Group not found");
        }
        // Prevent deleting if the teacher isnt the owner
        if (userRole === 'teacher' && group.teacherId.toString() !== userId.toString()) {
            throw AppError.forbidden("You can only delete your own groups");
        }

        // Prevent deleting if the Group already contains students
        if (group.studentsCount > 0) {
            throw AppError.badRequest("You can't delete a group that already has enrolled students");
        }

        // Remove group from course's groups array
        await this.courseModel.findByIdAndUpdate(
            group.courseId,
            { $pull: { groups: id } }
        );

        // Delete group
        await super.deleteById(id);

        return { message: "Group deleted successfully" };
    }

}


// export default new GroupService(Group);
export default GroupService;