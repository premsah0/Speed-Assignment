import express from 'express';
import { adminLogin } from '../controllers/adminAuthController.js';
import { validate } from '../middleware/validate.js';
import { adminLoginSchema } from '../validators/adminAuthValidator.js';

const router = express.Router();

// POST /api/admin/login
router.post('/login', validate(adminLoginSchema), adminLogin);

export default router;
