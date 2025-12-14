import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import multerMiddleware from '../../middlewares/multer.middleware.js';
import teacherController from "../../controllers/users/teacher.controller.js";
import payoutController from "../../controllers/payout.controller.js";


const router = Router();
const { authenticate, authorize } = authMiddleware;


router.use(authenticate, authorize("teacher"));

/* --- --- --- TEACHER ROUTES --- --- --- */
router.get("/dashboard",
    teacherController.getDashboard
);

router.get("/dashboard/academic-chart",
    teacherController.getAcademicChart
);

router.get("/dashboard/earnings-chart",
    teacherController.getEarningsChart
);

router.patch("/me/video",
    multerMiddleware.single("video"),
    teacherController.uploadVideo
);

router.post("/me/certificates",
    multerMiddleware.single("image"),
    teacherController.addCertificate
);

router.delete("/me/certificates/:id",
    teacherController.deleteCertificate
);

router.post("/payouts/onboard", payoutController.onboard);
router.get("/payouts/onboard/callback", payoutController.checkOnboarding);

/* --- --- --- --- --- --- --- --- --- --- */

export { router as teacherRouter };