import express from 'express';
import { getPublicReviews } from '../controllers/reviewController.js';

const router = express.Router();

// GET /api/reviews
router.get('/', getPublicReviews);

export default router;
