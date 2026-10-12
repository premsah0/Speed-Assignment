import { getActiveServices } from '../services/serviceService.js';

/**
 * GET /api/services
 * Returns list of active services for public website display.
 */
export const getPublicServices = async (req, res, next) => {
  try {
    const services = await getActiveServices();
    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};
