import BaseService from "./base.service.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/app.error.js";
import cloudinaryService from "./cloudinary.service.js";
import { emitNotification } from "../config/socket/index.js";
import notificationService from "./notification.service.js";

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
    async createLesson(data, user, files) {
        const { groupId, order } = data;
        const group = await this.groupModel.findById(groupId).populate("students", "_id name");
        if (!group) throw AppError.notFound("Group not found");

        // teacher can only create lessons for his own groups
        if (user.role === 'teacher' && group.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden("You can only create lessons for your own groups");

        // Prevent setting lesson order that already exists in this group
        const exists = await this.model.findOne({ groupId, order });
        if (exists) {
            throw AppError.badRequest("Lesson order already exists in this group");
        }
        const lessonData = { ...data };
        // Upload video
        if (files?.video?.[0]) {
            const uploadResult = await cloudinaryService.upload(files.video[0], `courses/${groupId}/lessons`);

            lessonData.video = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: "video"
            };
        }
        // upload documents (array)
        if (files?.document?.length) {
            lessonData.document = [];
            for (const docFile of files.document) {
                const uploadResult = await cloudinaryService.upload(docFile, `courses/${groupId}/lessons/documents`);
                lessonData.document.push({
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    type: "raw"
                });
            }
        }

        const lesson = await super.create(lessonData);
        group.lessons.push(lesson._id);
        await group.save();

        const studentIds = group.students?.map(s => s._id);

        if (lesson.groupId) {
            const notifications = await notificationService.notifyManyUsers({
                userIds: studentIds,
                title: "New Lesson",
                message: `A new lesson "${lesson?.title}" was added to your group`,
                type: "NEW_LESSON",
                refId: lesson?._id || null,
                refCollection: "Lesson"
            });
            studentIds.forEach(id => {
                const notif = notifications.find(n => n.receiver.toString() === id.toString());
                emitNotification({userId: id,notification: notif})}
            );
        
        }

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
    async updateLessonById(id, data, user, files) {
        const lesson = await this.model.findById(id).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");

        // Prevent editing if the teacher isn't the owner
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only edit your own lessons");
        }

        // Prevent duplicate order inside same group
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

        // ..................Upload files....................

        // Video
        if (files?.video?.[0]) {
            // Delete old video if exists
            if (lesson.video?.publicId) await cloudinaryService.delete(lesson.video.publicId,
                lesson.video.type
            );

            const uploadResult = await cloudinaryService.upload(
                files.video[0],
                `courses/${lesson.groupId._id}/lessons/videos`
            );

            data.video = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: "video"
            };
        }

        // Documents: add new ones
        if (files?.document?.length) {
            const newDocs = [];
            for (const docFile of files.document) {
                const uploadResult = await cloudinaryService.upload(docFile, `courses/${lesson.groupId._id}/lessons/documents`);
                newDocs.push({
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    type: "raw"
                });
            }

            data.document = [...(lesson.document || []), ...newDocs];
        }


        return await super.updateById(id, data);
    }


    /**
     * Deletes a video from a lesson.
     * Only teachers who own the group can delete videos.
     * @param {string} lessonId - The ID of the lesson to delete the video from
     * @param {Object} user - The user performing the deletion
     * @throws {forbidden} If the teacher is not the owner of the group
     * @returns {Promise<Object>} - The updated lesson without the video
     */
    async deleteVideo(lessonId, user) {
        const lesson = await this.model.findById(lessonId).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");

        // Prevent deleting if the teacher isn't the owner
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden();

        if (!lesson.video?.publicId) return lesson;

        // Delete video from cloudinary
        await cloudinaryService.delete(lesson.video.publicId, lesson.video.type);

        // Remove video from lesson
        lesson.video = undefined;
        return await lesson.save();
    }


    /**
     * Deletes a document from a lesson.
     * Only teachers who own the group can delete documents.
     * @param {string} lessonId - The ID of the lesson to delete the document from
     * @param {string} docId - The ID of the document to delete
     * @param {Object} user - The user performing the deletion
     * @throws {forbidden} If the teacher is not the owner of the group
     * @returns {Promise<Object>} - The updated lesson without the document
     */

    async deleteDocument(lessonId, docId, user) {
        const lesson = await this.model.findById(lessonId).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");

        // Prevent deleting if the teacher isn't the owner
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden();

        const docIndex = lesson.document.findIndex(d => d._id.toString() === docId || d.publicId === docId);
        if (docIndex === -1) throw AppError.notFound("Document not found");

        // Delete document from cloudinary
        await cloudinaryService.delete(lesson.document[docIndex].publicId,
            lesson.document[docIndex].type
        );

        // Remove document from lesson
        lesson.document.splice(docIndex, 1);

        return await lesson.save();
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

        //prevent deleting if the teacher isn't the owner
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only delete your own lessons");
        }
        // Delete video from cloudinary
        if (lesson.video?.publicId) {
            await cloudinaryService.delete(lesson.video.publicId,
                lesson.video.type
            );
        }

        // Delete documents from cloudinary
        if (lesson.document?.length) {
            for (const doc of lesson.document) {
                await cloudinaryService.delete(doc.publicId,
                    doc.type
                );
            }
        }
        await super.deleteById(id);
        return { message: "Lesson and its content deleted successfully" };
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
                    filter: { _id: lesson.lessonId, groupId },
                    update: { $set: { order: lesson.order } },
                },
            };
        });

        await this.model.bulkWrite(operations);

        return { message: "Lessons reordered successfully" };
    }
}

export default LessonService;
