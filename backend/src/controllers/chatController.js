import { generateChatResponse, getChatbotConfig } from '../services/chatbotService.js';
import { chatMessageSchema } from '../validators/chatValidator.js';

export async function getPublicChatbotConfigHandler(req, res, next) {
  try {
    const config = await getChatbotConfig();
    return res.status(200).json({
      success: true,
      data: {
        welcomeMessage: config.welcomeMessage,
        isEnabled: config.isEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleChatRequest(req, res, next) {
  try {
    const { message, history } = chatMessageSchema.parse(req.body);
    const reply = await generateChatResponse(message, history);

    return res.status(200).json({
      success: true,
      data: {
        reply: reply,
      },
    });
  } catch (error) {
    next(error);
  }
}
