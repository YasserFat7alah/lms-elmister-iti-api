import BaseService from "./base.service.js";
import Lesson from "../models/Lesson.js";
import AppError from "../utils/app.error.js";
import cloudinaryService from "./helpers/cloudinary.service.js";
import { emitNotification } from "../config/socket/index.js";
import notificationService from "./notification.service.js";

class LessonService extends BaseService {
    constructor(lessonModel, groupModel) {
        super(lessonModel);
        this.groupModel = groupModel;
        
    }

    /**
     * Creates a new lesson (Scheduled Session or Content).
     * Accepts date, startTime, endTime, location, type.
     */
    async createLesson(data, user, files) {
        const { groupId } = data;
        const group = await this.groupModel.findById(groupId).populate("students", "_id name");
        if (!group) throw AppError.notFound("Group not found");

        if (user.role === 'teacher' && group.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden("You can only create lessons for your own groups");

        if (data.order === undefined || data.order === null) {
            const lastLesson = await this.model.findOne({ groupId }).sort({ order: -1 });
            data.order = lastLesson ? lastLesson.order + 1 : 1;
        } else {
            const exists = await this.model.findOne({ groupId, order: data.order });
            if (exists) {
                throw AppError.badRequest("Lesson order already exists in this group");
            }
        }

        const lessonData = { 
            ...data,
            status: data.status || 'published' 
        };

        if (files?.video?.[0]) {
            const uploadResult = await cloudinaryService.upload(files.video[0], `courses/${groupId}/lessons`);
            lessonData.video = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                type: "video"
            };
        }
        
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
if (lesson.groupId && studentIds && studentIds.length > 0) {
            
            const notifications = await notificationService.notifyManyUsers({
                userIds: studentIds,
                title: "New Session Added",
                message: `New session "${lesson?.title}" scheduled on ${new Date(lesson.date).toLocaleDateString()}`,
                type: "NEW_LESSON",
                refId: lesson?._id || null,
                refCollection: "Lesson"
            });

            studentIds.forEach(id => {
                const notif = notifications.find(n => n.receiver.toString() === id.toString());
                if(notif) emitNotification({ userId: id, notification: notif });
            });
        }

        return lesson;
    }
    /**
     * Retrieves lessons for a group.
     */
async getLessonsByGroup(groupId, page = 1, limit = 50, currentUser) {
        if (!groupId) throw AppError.badRequest("Group ID is required");

        const group = await this.groupModel.findById(groupId);
        if (!group) throw AppError.notFound("Group not found");

        if (currentUser.role === "student") {
            const isStudentEnrolled = group.students.some(
                (studentId) => studentId.toString() === currentUser._id.toString()
            );

            if (!isStudentEnrolled) {
                throw AppError.forbidden("You are not enrolled in this group.");
            }
        }

        const skip = (page - 1) * limit;

        const lessons = await this.model
            .find({ groupId })
            .sort({ date: 1, startTime: 1, order: 1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "groupId", 
            populate: { path: "teacherId",
                select: "title link",
                select: "name" }            });
        const total = await this.model.countDocuments({ groupId });

        return {
            total,
            page,
            pages: Math.ceil(total / limit),
            data: lessons
        };
    }
    
    
    /**
     * Updates a lesson.
     */
    async updateLessonById(id, data, user, files) {
        const lesson = await this.model.findById(id).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");

        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only edit your own lessons");
        }

        if (data.order && data.order !== lesson.order) {
            const conflict = await this.model.findOne({
                _id: { $ne: id },
                groupId: lesson.groupId._id,
                order: data.order,
            });
            if (conflict) throw AppError.conflict("Lesson order already exists");
        }

        if (files?.video?.[0]) {
            if (lesson.video?.publicId) await cloudinaryService.delete(lesson.video.publicId, lesson.video.type);
            const uploadResult = await cloudinaryService.upload(files.video[0], `courses/${lesson.groupId._id}/lessons/videos`);
            data.video = { url: uploadResult.url, publicId: uploadResult.publicId, type: "video" };
        }

        if (files?.document?.length) {
            const newDocs = [];
            for (const docFile of files.document) {
                const uploadResult = await cloudinaryService.upload(docFile, `courses/${lesson.groupId._id}/lessons/documents`);
                newDocs.push({ url: uploadResult.url, publicId: uploadResult.publicId, type: "raw" });
            }
            data.document = [...(lesson.document || []), ...newDocs];
        }

        return await super.updateById(id, data);
    }

    /**
     *  Mark Attendance for a lesson.
     * @param {string} lessonId
     * @param {Array<{studentId: string, status: string}>} attendanceData 
     */
    async markAttendance(lessonId, attendanceData, user) {
        const lesson = await this.model.findById(lessonId).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");

        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You are not the owner of this group");
        }

        if (!Array.isArray(attendanceData)) {
            throw AppError.badRequest("Attendance data must be an array");
        }

        attendanceData.forEach(record => {
            const existingIndex = lesson.attendance.findIndex(
                a => a.studentId.toString() === record.studentId
            );

            if (existingIndex > -1) {
                // Update status
                lesson.attendance[existingIndex].status = record.status;
                if(record.attendedAt) lesson.attendance[existingIndex].attendedAt = record.attendedAt;
            } else {
                // Add new record
                lesson.attendance.push({
                    studentId: record.studentId,
                    status: record.status,
                    attendedAt: record.status === 'present' ? new Date() : null
                });
            }
        });

        await lesson.save();
        return { message: "Attendance updated successfully", attendance: lesson.attendance };
    }

    async deleteVideo(lessonId, user) {
        const lesson = await this.model.findById(lessonId).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden();
        if (!lesson.video?.publicId) return lesson;
        await cloudinaryService.delete(lesson.video.publicId, lesson.video.type);
        lesson.video = undefined;
        return await lesson.save();
    }

    async deleteDocument(lessonId, docId, user) {
        const lesson = await this.model.findById(lessonId).populate("groupId");
        if (!lesson) throw AppError.notFound("Lesson not found");
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString())
            throw AppError.forbidden();
        const docIndex = lesson.document.findIndex(d => d._id.toString() === docId || d.publicId === docId);
        if (docIndex === -1) throw AppError.notFound("Document not found");
        await cloudinaryService.delete(lesson.document[docIndex].publicId, lesson.document[docIndex].type);
        lesson.document.splice(docIndex, 1);
        return await lesson.save();
    }


async addMaterial(lessonId, materialData) {
    const lesson = await this.model.findByIdAndUpdate(
        lessonId,
        { $push: { materials: materialData } },
        { new: true }
    );

    if (!lesson) throw new Error("Lesson not found"); 
    return lesson;
}

async getLessonById(id, currentUser) {
        const lesson = await this.model.findById(id)
            .populate({
                path: "groupId",
                select: "students teacher" 
            })
            .populate("materials");

        if (!lesson) throw AppError.notFound("Lesson not found");

        if (currentUser.role === "student") {
            const isStudentEnrolled = lesson.groupId.students.some(
                (studentId) => studentId.toString() === currentUser._id.toString()
            );
            if (!isStudentEnrolled) {
                throw AppError.forbidden("You do not have access to this lesson.");
            }
        }

        return lesson;
    }



async removeMaterial(lessonId, materialId) {
    const lesson = await this.model.findByIdAndUpdate(
        lessonId,
        { $pull: { materials: { _id: materialId } } },
        { new: true }
    );

    if (!lesson) throw new Error("Lesson not found");
    return lesson;
}

    async deleteLesson(id, user) {
        const lesson = await this.model.findById(id).populate('groupId');
        if (!lesson) throw AppError.notFound("Lesson not found");
        if (user.role === "teacher" && lesson.groupId.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can only delete your own lessons");
        }
        if (lesson.video?.publicId) {
            await cloudinaryService.delete(lesson.video.publicId, lesson.video.type);
        }
        if (lesson.document?.length) {
            for (const doc of lesson.document) {
                await cloudinaryService.delete(doc.publicId, doc.type);
            }
        }
        await super.deleteById(id);
        return { message: "Lesson and its content deleted successfully" };
    }
























    
    async reorder(groupId, orderedLessons, user) {
        if (!Array.isArray(orderedLessons) || !orderedLessons.length) throw AppError.badRequest("Invalid data");
        const group = await this.groupModel.findById(groupId);
        if (!group) throw AppError.notFound("Group not found");
        if (user.role === "teacher" && group.teacherId.toString() !== user._id.toString()) {
            throw AppError.forbidden("You can't reorder lessons for this group");
        }
        const operations = orderedLessons.map((lesson) => ({
            updateOne: {
                filter: { _id: lesson.lessonId, groupId },
                update: { $set: { order: lesson.order } },
            },
        }));
        await this.model.bulkWrite(operations);
        return { message: "Lessons reordered successfully" };
    }
}

export default LessonService;