import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
} from '../controllers/adminSettingsController.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/', getAdminSettingsHandler);
router.patch('/', updateAdminSettingsHandler);

export default router;
