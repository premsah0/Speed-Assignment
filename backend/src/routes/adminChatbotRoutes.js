import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  getAdminChatbotConfigHandler,
  updateAdminChatbotConfigHandler,
  resetAdminChatbotConfigHandler,
} from '../controllers/adminChatbotController.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', getAdminChatbotConfigHandler);
router.patch('/', updateAdminChatbotConfigHandler);
router.delete('/', resetAdminChatbotConfigHandler);

export default router;
