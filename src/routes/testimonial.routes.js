import express from "express";  
import Testimonials from "../models/Testimonials.js";
import TestimonialService from "../services/testimonials.service.js";
import TestimonialController from "../controllers/testimonial.controller.js";
import validate from "../middlewares/validate.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import {testimonialSchema , updateTestimonialSchema } from "../validation/testimonials.validation.js";

const router = express.Router();
//.......................................Middlewares.........................................
const { authenticate, authorize } = auth;
//.......................................instances...........................................
const testimonialService = new TestimonialService(Testimonials);
const testimonial = new TestimonialController(testimonialService);


//.......................................User routes .........................................
//User Create a Testimonial
router.post("/", authenticate, validate(testimonialSchema) ,testimonial.createTestimonials);
//get all public (aprroved + Featured) testimonials
router.get("/public", testimonial.getPublicTestimonials);

//.....................................Admin routes ...........................................
router.use(authenticate, authorize("admin"));

//Get all testimonials
router.get("/", testimonial.getAllTestimonials);
//Approve and Feature a Testimonial (update status)
router.patch("/:id",validate(updateTestimonialSchema), testimonial.updateTestimonialStatus);
//Delete a Testimonial
router.delete("/:id", testimonial.deleteTestimonial);

export { router as testimonialRouter };