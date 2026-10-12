-- CreateTable
CREATE TABLE "WebsiteSettings" (
    "id" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL DEFAULT '+9779800000000',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@assignmentghar.com',
    "chatbotEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatbotMessage" TEXT NOT NULL DEFAULT 'Hello! How can we help you with your academic assignments today?',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 27.7172,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 85.3240,
    "address" TEXT NOT NULL DEFAULT 'Kathmandu, Nepal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSettings_pkey" PRIMARY KEY ("id")
);
