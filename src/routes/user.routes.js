import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import multerMiddleware from "../middlewares/multer.middleware";


const router = Router();
const upload = multerMiddleware;
const users =  User

const { authenticate, authorize } = authMiddleware

router.get('/me', authenticate, users.getMe);
router.put('/me', authenticate, users.updateMe);
router.post('/me/change-email', authenticate, users.changeEmailRequest);
router.post('/me/avatar', authenticate, upload.single('avatar'), users.uploadAvatar);


export default router;