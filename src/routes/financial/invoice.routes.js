import express from 'express';
import { getAllInvoices } from '../../controllers/invoice.controller.js';
import authMW from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(authMW.authenticate, authMW.authorize('admin'), getAllInvoices);

export default router;
