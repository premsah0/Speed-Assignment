import express from 'express';
import * as supportController from '../controllers/supportController.js';
import { validate } from '../middleware/validate.js';
import {
  preChatSchema,
  sessionInitSchema,
  customerMessageSchema,
  updateContactSchema,
} from '../validators/supportValidator.js';

const router = express.Router();

router.post('/start', validate(preChatSchema), supportController.startPreChat);
router.post('/session', validate(sessionInitSchema), supportController.initSession);
router.get('/conversation', supportController.getConversation);
router.post('/message', validate(customerMessageSchema), supportController.sendMessage);
router.get('/status', supportController.getAgentStatus);
router.patch('/contact', validate(updateContactSchema), supportController.updateContact);
router.patch('/read', supportController.markRead);

export default router;

