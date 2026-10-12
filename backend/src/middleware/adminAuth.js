import { verifyAdminToken } from '../services/adminAuthService.js';
import prisma from '../config/prisma.js';

/**
 * Real JWT Admin Authentication Middleware.
 * Reads Bearer token from Authorization header, verifies token,
 * attaches authenticated admin to req.admin, and rejects invalid/missing tokens with HTTP 401.
 */
export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Missing or invalid Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAdminToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Token is invalid or has expired.',
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Admin account no longer exists.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Token is invalid or has expired.',
    });
  }
};
