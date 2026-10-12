import { z } from 'zod';

export const createReviewSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty'),
  role: z
    .string({ required_error: 'Role is required' })
    .trim()
    .min(1, 'Role cannot be empty'),
  review: z
    .string({ required_error: 'Review is required' })
    .trim()
    .min(1, 'Review cannot be empty'),
  avatar: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const updateReviewSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
  role: z.string().trim().min(1, 'Role cannot be empty').optional(),
  review: z.string().trim().min(1, 'Review cannot be empty').optional(),
  avatar: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const reviewIdParamSchema = z.object({
  id: z.string({ required_error: 'Review ID is required' }).trim().min(1, 'Review ID cannot be empty'),
});
