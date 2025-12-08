import Joi from "joi";

const gradeLevels = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
];

const statusValues = ["draft", "in-review", "published", "archived"];

// Validation for creating a course
export const createCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required()
    .messages({
      "string.empty": "Title is required",
      "string.min": "Title must be between 3 and 150 characters",
      "string.max": "Title must be between 3 and 150 characters",
    }),
  subTitle: Joi.string().trim().min(3).max(150).required().messages({
    "string.empty": "Title is required",
    "string.min": "Sub-title must be between 3 and 150 characters",
    "string.max": "Sub-title must be between 3 and 150 characters",
  }),

  description: Joi.string().trim().min(10).max(2000).required()
    .messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description must be at most 2000 characters",
    }),

  subject: Joi.string().trim().required()
    .messages({
      "string.empty": "Subject is required",
    }),

  gradeLevel: Joi.string().valid(...gradeLevels).required()
    .messages({
      "any.only": `Grade level must be one of ${gradeLevels.join(", ")}`,
      "string.empty": "Grade level is required",
    }),

  status: Joi.string().valid(...statusValues).optional(),

  courseLanguage: Joi.string().optional().default("English"),

  tags: Joi.array().items(Joi.string().trim()).optional(),

  groups: Joi.array().items(Joi.string()).optional(),
  averageRating: Joi.number(),
  ratingsCount: Joi.number(),
});

// Validation for updating a course
export const updateCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).optional()
    .messages({
      "string.min": "Title must be at least 3 characters",
      "string.max": "Title must be at most 150 characters",
    }),
  subTitle: Joi.string().trim().min(3).max(150).messages({
    "string.min": "Sub-title must be between 3 and 150 characters",
    "string.max": "Sub-title must be between 3 and 150 characters",
  }),

  description: Joi.string().trim().min(10).max(2000).optional()
    .messages({
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description must be at most 2000 characters",
    }),

  subject: Joi.string().trim().optional(),

  gradeLevel: Joi.string().valid(...gradeLevels).optional()
    .messages({
      "any.only": `Grade level must be one of ${gradeLevels.join(", ")}`,
    }),

  status: Joi.string().valid(...statusValues).optional(),

  courseLanguage: Joi.string().optional(),

  tags: Joi.array().items(Joi.string().trim()).optional(),

  groups: Joi.array().items(Joi.string()).optional(),
});