import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../cloudinary.service.js";

class AssignmentService extends BaseService {
    constructor(model) {
        super(model);
    }
    async createAssignment({
        title, description, group,
        lesson, course, teacher,
        totalGrade = 100, dueDate, file
    }) {

        let uploadResult;
        if (file) {
            uploadResult = await cloudinaryService.upload(file, `courses/${group || lesson ||course}/assignments`);
        }
        const assignment = await this.model.create({
            title, description, group,
            lesson, course, teacher,
            totalGrade, dueDate,
            file: uploadResult
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

        const assignment = await this.model.findById(id).populate("teacher group lesson course");
        if (!assignment) throw AppError.notFound("Assignment not found");

        return assignment;
    }
}

export default AssignmentService;
