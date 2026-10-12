import { getSettings, updateSettings } from '../services/settingsService.js';
import { updateSettingsSchema } from '../validators/settingsValidator.js';

export async function getAdminSettingsHandler(req, res, next) {
  try {
    const settings = await getSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminSettingsHandler(req, res, next) {
  try {
    const validatedData = updateSettingsSchema.parse(req.body);
    const updatedSettings = await updateSettings(validatedData);

    return res.status(200).json({
      success: true,
      message: 'Website settings updated successfully',
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
}
