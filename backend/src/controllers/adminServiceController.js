import {
  getAllServices,
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
} from '../services/serviceService.js';

/**
 * GET /api/admin/services
 * Retrieves all services (both active and inactive) for admin management.
 */
export const adminGetServices = async (req, res, next) => {
  try {
    const services = await getAllServices();
    return res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/services
 * Creates a new service.
 */
export const adminCreateService = async (req, res, next) => {
  try {
    const newService = await createServiceRecord(req.body);
    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: newService,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/services/:id
 * Updates an existing service.
 */
export const adminUpdateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateServiceRecord(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/services/:id
 * Deletes a service.
 */
export const adminDeleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteServiceRecord(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
