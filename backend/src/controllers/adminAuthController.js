import { authenticateAdmin } from '../services/adminAuthService.js';

/**
 * POST /api/admin/login
 * Handles admin authentication and returns JWT token.
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateAdmin({ email, password });

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: result.token,
        admin: result.admin,
      },
    });
  } catch (error) {
    next(error);
  }
};
