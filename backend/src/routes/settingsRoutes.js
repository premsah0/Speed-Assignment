import { Router } from 'express';
import { getPublicSettingsHandler } from '../controllers/settingsController.js';

const router = Router();

router.get('/', getPublicSettingsHandler);

export default router;
