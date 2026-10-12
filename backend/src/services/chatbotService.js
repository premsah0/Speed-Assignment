import prisma from '../config/prisma.js';
import { getActiveServices } from './serviceService.js';

const DEFAULT_SYSTEM_PROMPT = `You are the official AI Assistant for Speed Assignment, a premier academic assignment and project support platform.

Follow these communication and persona rules:
1. SIMPLE GREETINGS: For greetings like "hi", "hello", "hey", "good morning", or "good evening", respond warmly, briefly, and naturally in one short sentence (e.g., "Hi! 👋 How can I help you with your assignment or project today?"). NEVER list services or give long promotional intros when the user only says hello.
2. SERVICE INQUIRIES: Only present a concise overview of Speed Assignment services (Essay Writing, Research Paper & Thesis, Programming & Coding, Dissertation, Homework, Case Study) when the user specifically asks what services we offer or how we can help.
3. DIRECT ACADEMIC ANSWERS: If the user asks a specific academic, programming, or project question, answer that question directly, accurately, and helpfully.
4. CONCISE & NATURAL: Keep responses concise by default (2-4 sentences max unless detailed explanations are explicitly requested). Avoid marketing brochure language, repetitive intros, and unnecessary disclaimers.
5. RELEVANT CONTACT INFO: Do not repeatedly push WhatsApp or the Contact page unless relevant to placing an order, requesting custom pricing, or submitting project files.
6. HONESTY: Do not invent prices, guarantees, deadlines, ratings, statistics, policies, or unlisted services. Always maintain Speed Assignment's identity as a reliable academic support assistant.`;

const DEFAULT_WELCOME_MESSAGE = "Hello! I am your Speed Assignment AI Assistant. How can I help you with your academic work today?";

/**
 * Gets or initializes the singleton ChatbotConfig record.
 */
export async function getChatbotConfig() {
  let config = await prisma.chatbotConfig.findFirst();
  if (!config) {
    config = await prisma.chatbotConfig.create({
      data: {
        isEnabled: true,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        welcomeMessage: DEFAULT_WELCOME_MESSAGE,
        model: 'gemini-3.5-flash',
        temperature: 0.7,
        maxTokens: 400,
      },
    });
  }
  return config;
}

/**
 * Updates the ChatbotConfig record.
 */
export async function updateChatbotConfig(data) {
  const current = await getChatbotConfig();
  return await prisma.chatbotConfig.update({
    where: { id: current.id },
    data,
  });
}

/**
 * Resets the ChatbotConfig record to defaults.
 */
export async function resetChatbotConfig() {
  const current = await getChatbotConfig();
  return await prisma.chatbotConfig.update({
    where: { id: current.id },
    data: {
      isEnabled: true,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      model: 'gemini-3.5-flash',
      temperature: 0.7,
      maxTokens: 400,
    },
  });
}

/**
 * Generates an AI response using the Google Gemini API.
 */
export async function generateChatResponse(userMessage, history = []) {
  const config = await getChatbotConfig();

  if (!config.isEnabled) {
    return "Our AI Chatbot is currently offline for maintenance. Please reach out to our team directly via WhatsApp or our Contact page for instant assistance.";
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return "Thank you for reaching out! Our AI Assistant is currently in setup mode. For immediate assignment help, please click 'Get Help Now' or submit your details on our Contact page.";
  }

  // Fetch active services context dynamically from PostgreSQL
  let servicesContextText = '';
  try {
    const services = await getActiveServices();
    if (services && services.length > 0) {
      servicesContextText = "\n\nCurrent Active Services Offered:\n" + services.map(s => `- ${s.title}: ${s.description}`).join("\n");
    }
  } catch (err) {
    console.warn("Could not load services context for chatbot:", err.message);
  }

  const fullSystemPrompt = `${config.systemPrompt}${servicesContextText}`;

  // Build Gemini contents array
  const contents = [];

  if (Array.isArray(history) && history.length > 0) {
    history.forEach(item => {
      if (item.content && item.content.trim()) {
        const role = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
        contents.push({
          role: role,
          parts: [{ text: item.content.trim() }]
        });
      }
    });
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const primaryModel = config.model || 'gemini-3.5-flash';
  const modelsToTry = [primaryModel];

  const fallbackModel = primaryModel === 'gemini-3.5-flash' ? 'gemini-3.8-flash' : 'gemini-3.5-flash';
  if (!modelsToTry.includes(fallbackModel)) {
    modelsToTry.push(fallbackModel);
  }

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const generationConfig = {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    };

    if (currentModel === 'gemini-3.5-flash') {
      generationConfig.thinkingConfig = {
        thinkingLevel: 'minimal'
      };
    }

    const payload = JSON.stringify({
      systemInstruction: {
        parts: [{ text: fullSystemPrompt }]
      },
      contents: contents,
      generationConfig: generationConfig
    });

    try {
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API HTTP Error (${response.status}) [${currentModel}]:`, errText);

        // Retry with fallback model if HTTP 503 or 429
        if ((response.status === 503 || response.status === 429) && i < modelsToTry.length - 1) {
          console.warn(`[Gemini Fallback] Primary model ${currentModel} returned ${response.status}. Retrying with fallback model: ${modelsToTry[i + 1]}`);
          continue;
        }

        return "I apologize, but I am unable to process your request at the moment. Please feel free to submit your project requirements via our Contact form or contact our advisors on WhatsApp!";
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (candidateText && candidateText.trim()) {
        return candidateText.trim();
      }

      return "Thank you for your inquiry! Our team is available to assist you directly. Please visit our Contact page or message us on WhatsApp for custom assistance.";

    } catch (err) {
      console.error(`Gemini API Network Exception [${currentModel}]:`, err);
      if (i < modelsToTry.length - 1) {
        console.warn(`[Gemini Fallback] Network exception on ${currentModel}. Retrying with fallback model: ${modelsToTry[i + 1]}`);
        continue;
      }
      return "We're experiencing temporary connection issues. Please try again shortly or contact our team directly via WhatsApp or the Contact page.";
    }
  }
}
