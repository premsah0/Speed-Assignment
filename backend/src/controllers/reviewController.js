import { getActiveReviews } from '../services/reviewService.js';

/**
 * GET /api/reviews
 * Returns list of active reviews for public website display.
 */
export const getPublicReviews = async (req, res, next) => {
  try {
    const reviews = await getActiveReviews();
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
