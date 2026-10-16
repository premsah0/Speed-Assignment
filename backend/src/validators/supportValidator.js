import { z } from 'zod';

export const preChatSchema = z.object({
  sessionToken: z.string().trim().min(8).max(128).optional(),
  customerName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name cannot exceed 80 characters'),
  customerPhone: z
    .string({ required_error: 'Mobile number is required' })
    .trim()
    .min(7, 'Mobile number must be at least 7 characters')
    .max(25, 'Mobile number is too long')
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length >= 7 && digitsOnly.length <= 16;
    }, 'Please enter a valid mobile number with at least 7 digits'),
  customerEmail: z.string().trim().email('Invalid email address').max(120).optional().or(z.literal('')),
});

export const sessionInitSchema = z.object({
  sessionToken: z.string().trim().min(8).max(128).optional(),
  customerName: z.string().trim().max(100).optional(),
  customerEmail: z.string().trim().email('Invalid email address').max(120).optional().or(z.literal('')),
  customerPhone: z.string().trim().max(40).optional().or(z.literal('')),
});

export const customerMessageSchema = z.object({
  sessionToken: z.string({ required_error: 'Session token is required' }).trim().min(8).max(128),
  text: z
    .string({ required_error: 'Message text is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(3000, 'Message cannot exceed 3000 characters'),
  senderName: z.string().trim().max(100).optional(),
});

export const adminMessageSchema = z.object({
  text: z
    .string({ required_error: 'Reply text is required' })
    .trim()
    .min(1, 'Reply cannot be empty')
    .max(3000, 'Reply cannot exceed 3000 characters'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'], {
    errorMap: () => ({ message: 'Status must be OPEN, PENDING, RESOLVED, or CLOSED' }),
  }),
});

export const updateContactSchema = z.object({
  sessionToken: z.string({ required_error: 'Session token is required' }).trim().min(8).max(128),
  customerName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name cannot exceed 80 characters')
    .optional(),
  customerEmail: z.string().trim().email('Invalid email address').max(120).optional().or(z.literal('')),
  customerPhone: z
    .string()
    .trim()
    .min(7, 'Mobile number must be at least 7 characters')
    .max(25, 'Mobile number is too long')
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length >= 7 && digitsOnly.length <= 16;
    }, 'Please enter a valid mobile number with at least 7 digits')
    .optional()
    .or(z.literal('')),
});

export const adminQuerySchema = z.object({
  status: z.enum(['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional().or(z.literal('')),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const deleteConversationsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Please select at least one conversation to delete'),
});



