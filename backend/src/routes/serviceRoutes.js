import express from 'express';
import { getPublicServices } from '../controllers/serviceController.js';

const router = express.Router();

// GET /api/services
router.get('/', getPublicServices);

export default router;
