import express from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  adminGetReviews,
  adminCreateReview,
  adminUpdateReview,
  adminDeleteReview,
} from '../controllers/adminReviewController.js';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
} from '../validators/reviewValidator.js';

const router = express.Router();

// Apply admin authentication to protect all admin review routes
router.use(requireAdminAuth);

// GET /api/admin/reviews
router.get('/', adminGetReviews);

// POST /api/admin/reviews
router.post('/', validate(createReviewSchema), adminCreateReview);

// PATCH /api/admin/reviews/:id
router.patch(
  '/:id',
  validate(reviewIdParamSchema, 'params'),
  validate(updateReviewSchema),
  adminUpdateReview
);

// DELETE /api/admin/reviews/:id
router.delete(
  '/:id',
  validate(reviewIdParamSchema, 'params'),
  adminDeleteReview
);

export default router;
