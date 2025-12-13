import express from 'express'
import adminController from '../../controllers/users/admin.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();
const { authenticate, authorize } = authMiddleware;


router.use(authenticate, authorize('admin'));

router.use('/dashboard', adminController.getDashboard);
router.get('/users/:id', adminController.getUserDetails);



export { router as adminRouter };
