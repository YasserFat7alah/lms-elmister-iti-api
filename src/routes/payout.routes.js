import express from "express";
import payoutController from "../controllers/payout.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(auth.authenticate);

/* --- --- --- PAYOUT ROUTES --- --- --- */
router.post("/claim",
  auth.authorize("teacher"), payoutController.requestPayout);                     // request payouts
router.get("/me", auth.authorize("teacher"), payoutController.getMyPayouts);      // list my payouts <teacher>

router.get("/", auth.authorize("admin"), payoutController.adminList);             // list all payouts <admin>
router.patch( "/:payoutId", auth.authorize("admin"), payoutController.adminUpdate // update payout (approve, reject) <admin>
);

export { router as payoutRouter };


