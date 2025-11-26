import Course from "../models/Course";
import BaseService from "./base.service";


class CourseService extends BaseService {

    constructor() {
        super(Course);
    }

}

export default new CourseService();