import express from "express";
import GroupController from "../controllers/group.controller.js";
import groupService from "../services/group.service.js";

import validate from "../middlewares/validate.middleware.js";
import { protect, authorize} from "../middlewares/auth.middleware.js";
import { createGroupSchema, updateGroupSchema } from "../validation/group.validation.js";

const router = express.Router();
const groupController = new GroupController(groupService)

/*----------------------------Public routes----------------------------*/

router.get("/", groupController.getAllGroups);
router.get("/:id", groupController.getGroupById);

/*--------------------Protected routes (Teacher and Admin)--------------------*/
router.post("/",protect, authorize("teacher,admin"), validate(createGroupSchema), groupController.createGroup);
router.patch("/:id", protect,authorize("teacher,admin"), validate(updateGroupSchema), groupController.updateGroupById);
router.delete("/:id",protect,authorize("teacher,admin"), groupController.deleteGroupById);


export { router as groupRouter };   