import { Router } from 'express';
import { handleChatRequest, getPublicChatbotConfigHandler } from '../controllers/chatController.js';

const router = Router();

router.get('/config', getPublicChatbotConfigHandler);
router.post('/', handleChatRequest);

export default router;
