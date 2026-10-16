import express from 'express';
import healthRoutes from './healthRoutes.js';
import contactRoutes from './contactRoutes.js';
import adminContactRoutes from './adminContactRoutes.js';
import adminAuthRoutes from './adminAuthRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import adminServiceRoutes from './adminServiceRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import adminSettingsRoutes from './adminSettingsRoutes.js';
import chatRoutes from './chatRoutes.js';
import adminChatbotRoutes from './adminChatbotRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import adminReviewRoutes from './adminReviewRoutes.js';
import adminUploadRoutes from './adminUploadRoutes.js';
import supportRoutes from './supportRoutes.js';
import adminSupportRoutes from './adminSupportRoutes.js';

const router = express.Router();

// Mount API routes
router.use('/health', healthRoutes);
router.use('/contact', contactRoutes);
router.use('/services', serviceRoutes);
router.use('/reviews', reviewRoutes);
router.use('/settings', settingsRoutes);
router.use('/chat', chatRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminAuthRoutes);
router.use('/admin/contact-requests', adminContactRoutes);
router.use('/admin/services', adminServiceRoutes);
router.use('/admin/reviews', adminReviewRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/chatbot-config', adminChatbotRoutes);
router.use('/admin/upload', adminUploadRoutes);
router.use('/admin/support', adminSupportRoutes);

export default router;


