import prisma from '../config/prisma.js';

/**
 * Retrieves only active reviews for public display, ordered by createdAt asc.
 */
export const getActiveReviews = async () => {
  return await prisma.review.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Retrieves all reviews for admin management.
 */
export const getAllReviews = async () => {
  return await prisma.review.findMany({
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Creates a new Review record.
 */
export const createReviewRecord = async (data) => {
  return await prisma.review.create({
    data: {
      name: data.name,
      role: data.role,
      review: data.review,
      avatar: data.avatar || 'img/testimonial-1.jpg',
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

/**
 * Updates an existing Review record by ID.
 */
export const updateReviewRecord = async (id, data) => {
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  return await prisma.review.update({
    where: { id },
    data,
  });
};

/**
 * Deletes a Review record by ID.
 */
export const deleteReviewRecord = async (id) => {
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  return await prisma.review.delete({
    where: { id },
  });
};
