import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import multerMiddleware from "../../middlewares/multer.middleware.js";
import userController from "../../controllers/user.controller.js";
import validate from "../../middlewares/validate.middleware.js";
import { userUpdateSchema } from "../../validation/user.validation.js";


const router = Router();
const upload = multerMiddleware;
const { getMe, updateMe, uploadAvatar } =  userController;

const { authenticate, authorize } = authMiddleware


router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, upload.single('avatar'), validate(userUpdateSchema), updateMe);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);

router.get('/', userController.getAll);



export { router as userRouter };