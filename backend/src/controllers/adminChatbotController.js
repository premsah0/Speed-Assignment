import {
  getChatbotConfig,
  updateChatbotConfig,
  resetChatbotConfig,
} from '../services/chatbotService.js';
import { updateChatbotConfigSchema } from '../validators/chatValidator.js';

export async function getAdminChatbotConfigHandler(req, res, next) {
  try {
    const config = await getChatbotConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminChatbotConfigHandler(req, res, next) {
  try {
    const validatedData = updateChatbotConfigSchema.parse(req.body);
    const updated = await updateChatbotConfig(validatedData);

    return res.status(200).json({
      success: true,
      message: 'Chatbot configuration updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetAdminChatbotConfigHandler(req, res, next) {
  try {
    const reset = await resetChatbotConfig();
    return res.status(200).json({
      success: true,
      message: 'Chatbot configuration reset to default settings',
      data: reset,
    });
  } catch (error) {
    next(error);
  }
}
