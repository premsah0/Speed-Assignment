import express from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  listContactRequests,
  patchContactRequestStatus,
} from '../controllers/adminContactController.js';
import {
  getContactRequestsQuerySchema,
  updateContactStatusSchema,
  contactIdParamSchema,
} from '../validators/adminContactValidator.js';

const router = express.Router();

// Apply admin authentication middleware to protect all admin contact routes
router.use(requireAdminAuth);

// GET /api/admin/contact-requests
router.get(
  '/',
  validate(getContactRequestsQuerySchema, 'query'),
  listContactRequests
);

// PATCH /api/admin/contact-requests/:id
router.patch(
  '/:id',
  validate(contactIdParamSchema, 'params'),
  validate(updateContactStatusSchema, 'body'),
  patchContactRequestStatus
);

export default router;
