import { z } from 'zod';

export const createServiceSchema = z.object({
  slug: z
    .string({ required_error: 'Slug is required' })
    .trim()
    .min(1, 'Slug cannot be empty')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty'),
  image: z
    .string()
    .trim()
    .min(1, 'Image cannot be empty')
    .default('img/property-1.jpg')
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug cannot be empty')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  description: z.string().trim().min(1, 'Description cannot be empty').optional(),
  image: z.string().trim().min(1, 'Image cannot be empty').optional(),
  isActive: z.boolean().optional(),
});

export const serviceIdParamSchema = z.object({
  id: z.string({ required_error: 'Service ID is required' }).trim().min(1, 'Service ID cannot be empty'),
});
