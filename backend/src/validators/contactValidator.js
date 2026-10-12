import { z } from 'zod';

export const contactRequestSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, 'Full name cannot be empty'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Invalid email address'),
  phone: z.string().trim().optional(),
  service: z
    .string({ required_error: 'Service needed is required' })
    .trim()
    .min(1, 'Service needed cannot be empty'),
  requirements: z
    .string({ required_error: 'Requirements are required' })
    .trim()
    .min(1, 'Requirements cannot be empty'),
});
