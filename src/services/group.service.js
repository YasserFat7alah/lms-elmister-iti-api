import BaseService from "./base.service";
import Group from "../models/Group.js";
import AppError from "../utils/app.error.js";

class GroupService extends BaseService {
    constructor(Group) {
        super(Group);
    }

    /**
     * Create a new group with the given data
     * @param {Object} data - The group data
     * @returns {Promise<Group>} - The created group
     */
    async createGroup(data) {

        if (data.capacity <= 0) {
            throw AppError.badRequest("Capacity must be greater than 0");
        }

        const group = await this.model.create(data);

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

        if (opened == 'true') {
            queryObj.$expr = { $lt: ["$studentsCount", "$capacity"] };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const groups = await this.model
            .find(queryObj)
            .skip(skip)
            .limit(limitNum)
            .populate('courseId', 'title')
            .populate('teacherId', 'name username')
            .populate('students', 'name username email')
            .sort('startingDate: 1');

        const total = await this.model.countDocuments(queryObj);
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

    async updateGroupById(id, data) {
        const group = await this.model.findById(id);

        if (!group) {
            throw AppError.notFound("Group not found");
        }

        // to prevent reducing Group's capacity below current students
        if (data.capacity && data.capacity < group.studentsCount) {
            throw new AppError.badRequest("Capacity cannot be less than current students count");
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

    async deleteGroupById(id) {
        const group = await this.model.findById(id);

        if (!group) {
            throw AppError.notFound("Group not found");
        }

        // Prevent deleting if the Group already contains students
        if (group.studentsCount > 0) {
            throw  AppError.badRequest("You can't delete a group that already has enrolled students");
        }
        await group.deleteOne();

        return { message: "Group deleted successfully" };
    }

}


// export default new GroupService(Group);
export default GroupService;