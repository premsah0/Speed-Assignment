import { z } from 'zod';

export const ALLOWED_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const getContactRequestsQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
      errorMap: () => ({
        message: 'Invalid status filter. Allowed values: PENDING, IN_PROGRESS, COMPLETED, CANCELLED',
      }),
    })
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1, 'Page number must be at least 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status. Allowed values: PENDING, IN_PROGRESS, COMPLETED, CANCELLED',
  }),
});

export const contactIdParamSchema = z.object({
  id: z.string({ required_error: 'Contact request ID is required' }).trim().min(1, 'Contact request ID cannot be empty'),
});
