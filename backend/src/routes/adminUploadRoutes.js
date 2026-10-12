import { Router } from 'express';
import multer from 'multer';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadImageHandler } from '../controllers/adminUploadController.js';

const router = Router();

// Protect image upload endpoint with JWT Admin Auth
router.use(requireAdminAuth);

// Helper wrapper to catch multer errors gracefully
const handleSingleUpload = (req, res, next) => {
  const singleUpload = upload.single('image');
  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 5MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Image upload failed.',
      });
    }
    next();
  });
};

// POST /api/admin/upload
router.post('/', handleSingleUpload, uploadImageHandler);

export default router;
