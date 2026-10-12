import prisma from '../config/prisma.js';

/**
 * Get or initialize the singleton WebsiteSettings record.
 */
export async function getSettings() {
  let settings = await prisma.websiteSettings.findFirst();
  if (!settings) {
    settings = await prisma.websiteSettings.create({
      data: {
        whatsappNumber: '+9779800000000',
        contactEmail: 'info@speedassignment.com',
        chatbotEnabled: true,
        chatbotMessage: 'Hello! How can we help you with your academic assignments today?',
        latitude: 27.7172,
        longitude: 85.3240,
        address: 'Kathmandu, Nepal',
      },
    });
  }
  return settings;
}

/**
 * Get public website settings.
 */
export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    whatsappNumber: settings.whatsappNumber,
    contactEmail: settings.contactEmail,
    chatbotEnabled: settings.chatbotEnabled,
    chatbotMessage: settings.chatbotMessage,
    latitude: settings.latitude,
    longitude: settings.longitude,
    address: settings.address,
  };
}

/**
 * Update the singleton WebsiteSettings record.
 */
export async function updateSettings(data) {
  const currentSettings = await getSettings();
  const updated = await prisma.websiteSettings.update({
    where: { id: currentSettings.id },
    data,
  });
  return updated;
}
