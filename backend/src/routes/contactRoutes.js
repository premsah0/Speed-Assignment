import express from 'express';
import { submitContactRequest } from '../controllers/contactController.js';
import { validate } from '../middleware/validate.js';
import { contactRequestSchema } from '../validators/contactValidator.js';

const router = express.Router();

// POST /api/contact
router.post('/', validate(contactRequestSchema), submitContactRequest);

export default router;
