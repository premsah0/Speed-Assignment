import { createContactRequest } from '../services/contactService.js';

/**
 * Handles submission of a new Contact Request.
 * POST /api/contact
 */
export const submitContactRequest = async (req, res, next) => {
  try {
    const newRequest = await createContactRequest(req.body);

    return res.status(201).json({
      success: true,
      message: 'Contact request submitted successfully',
      data: {
        id: newRequest.id,
        status: newRequest.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
