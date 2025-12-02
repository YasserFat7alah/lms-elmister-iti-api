import express from "express";
import GroupController from "../controllers/group.controller.js";
import GroupService from "../services/group.service.js";
import Group from "../models/Group.js";
import validate from "../middlewares/validate.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import { createGroupSchema, updateGroupSchema } from "../validation/group.validation.js";

const router = express.Router();
//instances
const groupService = new GroupService(Group);
const groupController = new GroupController(groupService)

/*----------------------------Public routes----------------------------*/

router.get("/", groupController.getAllGroups);
router.get("/:id", groupController.getGroupById);

/*--------------------Protected routes (Teacher and Admin)--------------------*/
router.use(auth.protect);

router.post("/", auth.authorize("teacher,admin"), validate(createGroupSchema), groupController.createGroup);
router.patch("/:id", auth.authorize("teacher,admin"), validate(updateGroupSchema), groupController.updateGroupById);
router.delete("/:id", auth.authorize("teacher,admin"), groupController.deleteGroupById);


export { router as groupRouter };   