import BaseService from "../base.service.js";
import AppError from "../../utils/app.error.js";
import cloudinaryService from "../helpers/cloudinary.service.js";


class SubmissionService extends BaseService {
    constructor(model) {
        super(model);
    }

    async submit({ assignmentId, studentId, content, file }) {
        const existing = await this.model.findOne({ assignment: assignmentId, student: studentId });
        if (existing) throw AppError.badRequest("Already submitted");

        let uploadResult = null;

        if (file) {
            uploadResult = await cloudinaryService.upload(file, `courses/submissions/${assignmentId}`);
        }

        const submitted = await this.model
            .create({
                assignment: assignmentId, 
                student: studentId, 
                content,
                file: uploadResult ? {
                    url:uploadResult.url,
                    publicId: uploadResult.publicId,
                    type: "raw"
                } : null
            });

        return submitted;
    }

    async grade(submissionId, grade, feedback) {

        const submission = await this.model.findById(submissionId);
        if (!submission) throw AppError.notFound("Submission not found");

        submission.grade = grade;
        submission.feedback = feedback;

        await submission.save();

        return submission;
    }

    async getSubmissions(filter = {}, options = {}) {
        const query = this.model.find(filter);

        if (options.populate) {
            query.populate(options.populate);
        }

        if (options.sort) {
            query.sort(options.sort);
        }

        const submissions = await query;

        if (!submissions.length) {
            throw AppError.notFound("No submissions found");
        }

        return submissions;
    }

}

export default SubmissionService;