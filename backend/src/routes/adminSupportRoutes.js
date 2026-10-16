import express from 'express';
import * as adminSupportController from '../controllers/adminSupportController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  adminQuerySchema,
  adminMessageSchema,
  updateStatusSchema,
  deleteConversationsSchema,
} from '../validators/supportValidator.js';

const router = express.Router();

// Require admin authentication for all support admin routes
router.use(requireAdminAuth);

router.get('/conversations', validate(adminQuerySchema, 'query'), adminSupportController.listConversations);
router.delete('/conversations', validate(deleteConversationsSchema), adminSupportController.deleteConversations);
router.post('/conversations/delete', validate(deleteConversationsSchema), adminSupportController.deleteConversations);
router.get('/conversations/:id', adminSupportController.getConversation);
router.post('/conversations/:id/messages', validate(adminMessageSchema), adminSupportController.sendReply);
router.patch('/conversations/:id/status', validate(updateStatusSchema), adminSupportController.updateStatus);
router.patch('/conversations/:id/read', adminSupportController.markRead);

export default router;

