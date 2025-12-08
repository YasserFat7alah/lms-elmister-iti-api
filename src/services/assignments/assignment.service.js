import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../cloudinary.service.js";
import Group from "../../models/Group.js";
import Lesson from "../../models/Lesson.js";


class AssignmentService extends BaseService {
    constructor(model) {
        super(model);
    }
    async createAssignment({
        title, description, group, lesson, teacher, totalGrade = 100, dueDate, file
    }) {

        //only one of group or lesson can be provided
        if (group && lesson) {
            throw AppError.badRequest("Please provide either group OR lesson, not both");
        }

        let course;
        //..........Group.............
        if (group) {
            const groupDoc = await Group.findById(group);
            if (!groupDoc)
                throw AppError.notFound("Group not found");

            if (groupDoc.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create assignments for this group");
            }
            course = groupDoc.courseId;
        }
        //..........Lesson.............
        if (lesson) {
            const lessonDoc = await Lesson.findById(lesson).populate("groupId");
            if (!lessonDoc)
                throw AppError.notFound("Lesson not found");

            //checks if the lesson is linked to a group before creating an assignment
            if (!lessonDoc.groupId) {
                throw AppError.badRequest("Lesson is not linked to any group");
            }
            //prevents creating assignments for lessons that are not owned by the teacher
            if (lessonDoc.groupId.teacherId.toString() !== teacher.toString()) {
                throw AppError.forbidden("You are not allowed to create assignments for this lesson");
            }

            course = lessonDoc.groupId.course;
            group = lessonDoc.groupId._id;
        }

        if (!course) {
            throw AppError.badRequest("Assignment must belong to a group or a lesson");
        }

        let uploadResult;
        if (file) {
            uploadResult = await cloudinaryService.upload(file, `courses/${group || lesson || course}/assignments`);
        }
        const assignment = await this.model.create({
            title, description, group, lesson, course, teacher, totalGrade, dueDate, file: uploadResult
        });

        return assignment;
    }

    async getAssignmentsByGroup(groupId) {

        const assignments = await this.model
            .find({ group: groupId })
            .populate("teacher", "name email")
            .sort({ dueDate: 1 })

        return assignments;
    }

    async getAssignmentsByLesson(lessonId) {

        const assignments = await this.model
            .find({ lesson: lessonId })
            .populate("teacher", "name email")
            .sort({ dueDate: 1 });

        return assignments;
    }

    async getAssignmentById(id) {

        const assignment = await this.model.findById(id)
            .populate("group", "title")
            .populate("course", "title")
            .populate("teacher", "name email")

        if (!assignment) throw AppError.notFound("Assignment not found");

        return assignment;
    }
}

export default AssignmentService;
