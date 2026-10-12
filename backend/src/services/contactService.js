import prisma from '../config/prisma.js';

/**
 * Creates a new ContactRequest record in PostgreSQL using Prisma.
 * @param {Object} data - Contact request payload.
 * @returns {Promise<Object>} Created ContactRequest record.
 */
export const createContactRequest = async (data) => {
  return await prisma.contactRequest.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || null,
      service: data.service,
      requirements: data.requirements,
    },
  });
};

/**
 * Retrieves paginated contact requests with optional status filtering, ordered newest first.
 * @param {Object} params - Query parameters.
 * @param {string} [params.status] - Optional status filter.
 * @param {number|string} [params.page=1] - Page number.
 * @param {number|string} [params.limit=10] - Items per page.
 * @returns {Promise<Object>} Paginated contact requests with metadata.
 */
export const getContactRequests = async ({ status, page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;
  const where = status ? { status } : {};

  const [total, data] = await Promise.all([
    prisma.contactRequest.count({ where }),
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

/**
 * Updates the status of an existing ContactRequest.
 * @param {string} id - ContactRequest ID.
 * @param {string} status - New status string.
 * @returns {Promise<Object|null>} Updated record or null if not found.
 */
export const updateContactRequestStatus = async (id, status) => {
  const existing = await prisma.contactRequest.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  return await prisma.contactRequest.update({
    where: { id },
    data: { status },
  });
};
