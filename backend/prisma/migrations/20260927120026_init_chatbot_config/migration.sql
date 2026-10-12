-- CreateTable
CREATE TABLE "ChatbotConfig" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are the official AI Assistant for AssignmentGhar, a premiere academic assignment and project support platform. Your job is to help students choose the right academic services (Essay Writing, Research Paper, Programming & Coding, Dissertation, Homework, Case Study), explain how to submit requirements via the contact page, and answer questions politely, professionally, and accurately.',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! I am your AssignmentGhar AI Assistant. How can I help you with your academic work today?',
    "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConfig_pkey" PRIMARY KEY ("id")
);
