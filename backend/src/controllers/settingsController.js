import { getPublicSettings } from '../services/settingsService.js';

export async function getPublicSettingsHandler(req, res, next) {
  try {
    const settings = await getPublicSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}
