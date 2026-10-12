import {
  getAllReviews,
  createReviewRecord,
  updateReviewRecord,
  deleteReviewRecord,
} from '../services/reviewService.js';

/**
 * GET /api/admin/reviews
 * Retrieves all reviews (active and inactive) for admin management.
 */
export const adminGetReviews = async (req, res, next) => {
  try {
    const reviews = await getAllReviews();
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reviews
 * Creates a new review.
 */
export const adminCreateReview = async (req, res, next) => {
  try {
    const newReview = await createReviewRecord(req.body);
    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reviews/:id
 * Updates an existing review.
 */
export const adminUpdateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateReviewRecord(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/reviews/:id
 * Deletes a review.
 */
export const adminDeleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteReviewRecord(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
