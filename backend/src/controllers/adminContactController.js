import {
  getContactRequests,
  updateContactRequestStatus,
} from '../services/contactService.js';

/**
 * GET /api/admin/contact-requests
 * Retrieves contact requests with optional status filtering and pagination.
 */
export const listContactRequests = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await getContactRequests({ status, page, limit });

    return res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/contact-requests/:id
 * Updates status of a contact request.
 */
export const patchContactRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await updateContactRequestStatus(id, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Contact request not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact request status updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
