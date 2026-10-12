import { z } from 'zod';

export const updateSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .min(1, 'WhatsApp number cannot be empty')
    .optional(),
  contactEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional(),
  chatbotEnabled: z.boolean().optional(),
  chatbotMessage: z
    .string()
    .trim()
    .min(1, 'Chatbot message cannot be empty')
    .optional(),
  latitude: z
    .number({ invalid_type_error: 'Latitude must be a valid number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number({ invalid_type_error: 'Longitude must be a valid number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  address: z
    .string()
    .trim()
    .min(1, 'Address cannot be empty')
    .optional(),
});
