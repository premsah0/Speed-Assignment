import express from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import {
  adminGetServices,
  adminCreateService,
  adminUpdateService,
  adminDeleteService,
} from '../controllers/adminServiceController.js';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
} from '../validators/serviceValidator.js';

const router = express.Router();

// Apply admin authentication to protect all admin service routes
router.use(requireAdminAuth);

// GET /api/admin/services
router.get('/', adminGetServices);

// POST /api/admin/services
router.post('/', validate(createServiceSchema), adminCreateService);

// PATCH /api/admin/services/:id
router.patch(
  '/:id',
  validate(serviceIdParamSchema, 'params'),
  validate(updateServiceSchema),
  adminUpdateService
);

// DELETE /api/admin/services/:id
router.delete(
  '/:id',
  validate(serviceIdParamSchema, 'params'),
  adminDeleteService
);

export default router;
