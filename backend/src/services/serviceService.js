import prisma from '../config/prisma.js';

/**
 * Retrieves only active services for public display, ordered stably by createdAt asc.
 */
export const getActiveServices = async () => {
  return await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Retrieves all services for admin management, ordered stably by createdAt asc.
 */
export const getAllServices = async () => {
  return await prisma.service.findMany({
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Creates a new Service record.
 */
export const createServiceRecord = async (data) => {
  const existingSlug = await prisma.service.findUnique({
    where: { slug: data.slug },
  });

  if (existingSlug) {
    const error = new Error(`Service with slug '${data.slug}' already exists.`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.service.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description,
      image: data.image,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

/**
 * Updates an existing Service record by ID.
 */
export const updateServiceRecord = async (id, data) => {
  const existing = await prisma.service.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  if (data.slug && data.slug !== existing.slug) {
    const duplicateSlug = await prisma.service.findUnique({
      where: { slug: data.slug },
    });
    if (duplicateSlug) {
      const error = new Error(`Service with slug '${data.slug}' already exists.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return await prisma.service.update({
    where: { id },
    data,
  });
};

/**
 * Deletes a Service record by ID.
 */
export const deleteServiceRecord = async (id) => {
  const existing = await prisma.service.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  return await prisma.service.delete({
    where: { id },
  });
};
