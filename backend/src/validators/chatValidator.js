import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message exceeds maximum length of 2000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

export const updateChatbotConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  systemPrompt: z
    .string()
    .trim()
    .min(1, 'System prompt cannot be empty')
    .optional(),
  welcomeMessage: z
    .string()
    .trim()
    .min(1, 'Welcome message cannot be empty')
    .optional(),
  model: z
    .string()
    .trim()
    .min(1, 'Model name cannot be empty')
    .optional(),
  temperature: z
    .number({ invalid_type_error: 'Temperature must be a number' })
    .min(0, 'Temperature minimum is 0')
    .max(2, 'Temperature maximum is 2')
    .optional(),
  maxTokens: z
    .number({ invalid_type_error: 'Max Tokens must be an integer' })
    .int()
    .min(50, 'Max Tokens minimum is 50')
    .max(8000, 'Max Tokens maximum is 8000')
    .optional(),
});
