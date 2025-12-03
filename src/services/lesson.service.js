import BaseService from "./base.service.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/app.error.js";

class LessonService extends BaseService {
    constructor(lessonModel, groupModel) {
        super(lessonModel);
        this.groupModel = groupModel;
    }

    /**
     * Creates a new lesson.
     * Teachers can only create lessons for their own groups.
     * Prevents setting a lesson order that already exists in this group.
     * @param {Object} data - The lesson data.
     * @param {Object} user - The user performing the creation.
     * @throws {forbidden} - If the teacher is not the owner of the group.
     * @throws {badRequest} - If the lesson order already exists in this group.
     * @returns {Promise<Lesson>} - The newly created lesson.
     */
    async createLesson(data, user) {
        const { groupId, order } = data;
        const group = await this.groupModel.findById(groupId);

        if (!group) throw AppError.notFound("Group not found");
        // teacher can only create lessons for his own groups
        if (user.user.role === 'teacher' && group.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden("You can only create lessons for your own groups");

        // Prevent setting lesson order that already exists in this group
        const exists = await this.model.findOne({ groupId, order });
        if (exists) {
            throw AppError.badRequest("Lesson order already exists in this group");
        }

        const lesson = await super.create(data);

        return lesson;
    }


        /**
         * Retrieves lessons for a given group ID, paginated.
         * @param {string} groupId - The ID of the group to retrieve lessons for.
         * @param {number} [page=1] - The page number to retrieve.
         * @param {number} [limit=10] - The number of lessons to retrieve per page.
         * @returns {Promise<Object>} - An object containing the total number of lessons, current page number, total number of pages, and an array of lessons.
         */
    async getLessonsByGroup(groupId, page = 1, limit = 10) {

        if (!groupId) throw AppError.badRequest("Group ID is required");

        const skip = (page - 1) * limit;
        const lessons = await this.model
            .find({ groupId })
            .sort({ order: 1 })
            .skip(skip)
            .limit(limit)

        //total number of docs in lessons
        const total = await this.model.countDocuments({ groupId });

        return {
            total,
            page,
            pages: Math.ceil(total / limit),//total number of pages
            data: lessons
        };
    }


    /**
     * Updates a lesson by ID.
     * Checks if the teacher is the owner of the lesson before updating.
     * If a new order is provided, it will replace the old one.
     * Prevents setting a lesson order that already exists in this group.
     * @param {string} id - The ID of the lesson to update
     * @param {Object} data - The updated lesson data
     * @param {Object} user - The user performing the update
     * @throws {Forbidden} You can only edit your own lessons
     * @throws {Conflict} Lesson order already exists in this group
     * @returns {Promise<Lesson>} - The updated lesson
     */
    async updateLessonById(id, data, user) {
        const lesson = await this.model.findById(id).populate('groupId');

        if (!lesson) throw AppError.notFound("Lesson not found");

        // Prevent editing if the teacher isnt the owner
        if (user.role === 'teacher' && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only edit your own lessons");
        }

        if (data.order && data.order !== lesson.order) {
            const conflict = await this.model.findOne({
                _id: { $ne: id },
                groupId: lesson.groupId._id,
                order: data.order,
            });

            if (conflict) {
                throw AppError.conflict("Lesson order already exists in this group");
            }
        }

        return await super.updateById(id, data);
    }


    /**
     * Deletes a lesson by ID.
     * Only teachers who own the group can delete lessons.
     * @param {string} id - The ID of the lesson to delete
     * @param {Object} user - The user performing the deletion
     * @throws {forbidden} If the teacher is not the owner of the group
     * @returns {Promise<Object>} - An object containing a success message
     */
    async deleteLesson(id, user) {
        const lesson = await this.model.findById(id).populate('groupId');

        if (!lesson) throw AppError.notFound("Lesson not found");

        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only delete your own lessons");
        }

        return await super.deleteById(id);
    }

    /**
     * Reorders lessons in a group by providing an array of lesson objects with their updated orders.
     * Only teachers who own the group can reorder lessons.
     * @param {string} groupId - The ID of the group
     * @param {Array<Object>} orderedLessons - An array of lesson objects with their updated orders
     * @param {Object} user - The user performing the reorder
     * @throws {badRequest} If the provided data is invalid
     * @throws {forbidden} If the teacher is not the owner of the group
     * @returns {Promise<Object>} - An object containing a success message
     */
    async reorder(groupId, orderedLessons, user) {
        // Check if orderedLessons is an array and not empty
        if (!Array.isArray(orderedLessons) || !orderedLessons.length) {
            throw AppError.badRequest("Invalid data");
        }

        const group = await this.groupModel.findById(groupId);

        if (!group) throw AppError.notFound("Group not found");

        // Prevent reordering if the teacher isnt the owner
        if (user.role === "teacher" && group.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can't reorder lessons for this group");
        }

        const operations = orderedLessons.map((lesson) => {
            return {
                updateOne: {
                    filter: { _id: lesson.id, groupId },
                    update: { $set: { order: lesson.order } },
                },
            };
        });

        await this.model.bulkWrite(operations);

        return { message: "Lessons reordered successfully" };
    }
}

export default LessonService;
