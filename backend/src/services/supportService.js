import crypto from 'crypto';
import prisma from '../config/prisma.js';

// Global reference to count active admin socket connections
let getOnlineAdminCountFn = () => 0;

export const setOnlineAdminCounter = (fn) => {
  getOnlineAdminCountFn = fn;
};

export const getOnlineAgentStatus = () => {
  const count = typeof getOnlineAdminCountFn === 'function' ? getOnlineAdminCountFn() : 0;
  return {
    isOnline: count > 0,
    onlineAgentCount: count,
  };
};

/**
 * Gets an existing conversation by its secure session token or creates a new one.
 */
export const getOrCreateConversation = async ({
  sessionToken,
  customerName,
  customerEmail,
  customerPhone,
} = {}) => {
  let conversation = null;

  if (sessionToken) {
    conversation = await prisma.supportConversation.findUnique({
      where: { sessionToken },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  const cleanName = customerName && customerName.trim() ? customerName.trim() : null;
  const cleanEmail = customerEmail && customerEmail.trim() ? customerEmail.trim() : null;
  const cleanPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : null;

  if (conversation) {
    // If new contact details provided, update them
    const updateData = {};
    if (cleanName && cleanName !== conversation.customerName) updateData.customerName = cleanName;
    if (cleanEmail !== undefined && cleanEmail !== conversation.customerEmail) updateData.customerEmail = cleanEmail;
    if (cleanPhone && cleanPhone !== conversation.customerPhone) updateData.customerPhone = cleanPhone;

    if (Object.keys(updateData).length > 0) {
      conversation = await prisma.supportConversation.update({
        where: { id: conversation.id },
        data: updateData,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return { conversation, isNew: false };
  }

  // Create new conversation with a secure cryptographic session token
  const newSessionToken = crypto.randomUUID();
  conversation = await prisma.supportConversation.create({
    data: {
      sessionToken: newSessionToken,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      status: 'OPEN',
      messages: {
        create: [
          {
            senderType: 'SYSTEM',
            senderName: 'Academic Expert',
            text: 'Welcome to Live Chat with Experts! How can we assist you with your academic work today?',
            isRead: true,
          },
        ],
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return { conversation, isNew: true };
};

/**
 * Starts or updates a conversation with validated pre-chat contact info.
 */
export const startCustomerConversation = async ({
  sessionToken,
  customerName,
  customerPhone,
  customerEmail,
}) => {
  const cleanName = (customerName || '').trim();
  if (!cleanName || cleanName.length < 2) {
    const error = new Error('Full name is required (minimum 2 characters)');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = (customerPhone || '').trim();
  const digits = cleanPhone.replace(/\D/g, '');
  if (!cleanPhone || digits.length < 7 || digits.length > 16) {
    const error = new Error('Please enter a valid mobile number with at least 7 digits');
    error.statusCode = 400;
    throw error;
  }

  return getOrCreateConversation({
    sessionToken,
    customerName: cleanName,
    customerPhone: cleanPhone,
    customerEmail: (customerEmail || '').trim() || null,
  });
};

/**
 * Retrieves a customer's conversation by sessionToken.
 */
export const getConversationBySessionToken = async (sessionToken) => {
  if (!sessionToken) return null;

  return prisma.supportConversation.findUnique({
    where: { sessionToken },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

/**
 * Appends a message from the customer and notifies admins.
 */
export const addCustomerMessage = async ({ sessionToken, text, senderName }) => {
  const conversation = await prisma.supportConversation.findUnique({
    where: { sessionToken },
  });

  if (!conversation) {
    const error = new Error('Conversation not found for session token');
    error.statusCode = 404;
    throw error;
  }

  // Enforce pre-chat completion requirement: Full name & Mobile number must be present
  const hasName =
    conversation.customerName &&
    conversation.customerName.trim().length >= 2 &&
    conversation.customerName !== 'Visitor';
  const hasPhone =
    conversation.customerPhone && conversation.customerPhone.replace(/\D/g, '').length >= 7;

  if (!hasName || !hasPhone) {
    const error = new Error(
      'Pre-chat form must be completed with full name and mobile number before sending messages.'
    );
    error.statusCode = 400;
    throw error;
  }

  if (conversation.status === 'RESOLVED' || conversation.status === 'CLOSED') {
    const error = new Error('This conversation has ended. Please start a new chat if you need further help.');
    error.statusCode = 400;
    throw error;
  }

  const name = conversation.customerName || senderName || 'Customer';

  // Transaction: create message and update conversation status + unread counters
  const [message, updatedConversation] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CUSTOMER',
        senderName: name,
        text: text.trim(),
        isRead: false,
      },
    }),
    prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadAdminCount: { increment: 1 },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ]);

  return { message, conversation: updatedConversation };
};

/**
 * Appends a message from an authenticated admin support agent.
 */
export const addAdminMessage = async ({ conversationId, adminId, adminName, text }) => {
  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (conversation.status === 'RESOLVED' || conversation.status === 'CLOSED') {
    const error = new Error('This conversation has ended. Reopen or start a new conversation to send messages.');
    error.statusCode = 400;
    throw error;
  }

  const [message, updatedConversation] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId,
        senderType: 'AGENT',
        senderId: adminId,
        senderName: adminName || 'Academic Expert',
        text: text.trim(),
        isRead: false,
      },
    }),
    prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        unreadCustomerCount: { increment: 1 },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ]);

  return { message, conversation: updatedConversation };
};


/**
 * Marks all customer messages in a conversation as read by the admin.
 */
export const markConversationReadByAdmin = async (conversationId) => {
  await prisma.$transaction([
    prisma.supportConversation.update({
      where: { id: conversationId },
      data: { unreadAdminCount: 0 },
    }),
    prisma.supportMessage.updateMany({
      where: {
        conversationId,
        senderType: 'CUSTOMER',
        isRead: false,
      },
      data: { isRead: true },
    }),
  ]);
};

/**
 * Marks all agent messages in a conversation as read by the customer.
 */
export const markConversationReadByCustomer = async (sessionToken) => {
  const conversation = await prisma.supportConversation.findUnique({
    where: { sessionToken },
    select: { id: true },
  });

  if (!conversation) return;

  await prisma.$transaction([
    prisma.supportConversation.update({
      where: { id: conversation.id },
      data: { unreadCustomerCount: 0 },
    }),
    prisma.supportMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderType: 'AGENT',
        isRead: false,
      },
      data: { isRead: true },
    }),
  ]);
};

/**
 * Updates conversation status (e.g., OPEN, PENDING, RESOLVED).
 */
export const updateConversationStatus = async (conversationId, status) => {
  return prisma.supportConversation.update({
    where: { id: conversationId },
    data: { status },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

/**
 * Updates customer contact information.
 */
export const updateCustomerContact = async ({
  sessionToken,
  customerName,
  customerEmail,
  customerPhone,
}) => {
  const conversation = await prisma.supportConversation.findUnique({
    where: { sessionToken },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const updateData = {};
  if (customerName !== undefined) updateData.customerName = customerName.trim();
  if (customerEmail !== undefined) updateData.customerEmail = customerEmail.trim() || null;
  if (customerPhone !== undefined) updateData.customerPhone = customerPhone.trim() || null;

  return prisma.supportConversation.update({
    where: { id: conversation.id },
    data: updateData,
  });
};

/**
 * Lists conversations for admin dashboard with filtering and pagination.
 */
export const listConversationsForAdmin = async ({
  status = 'ALL',
  search = '',
  page = 1,
  limit = 30,
} = {}) => {
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: q, mode: 'insensitive' } },
      {
        messages: {
          some: {
            text: { contains: q, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const [total, unreadCount, conversations] = await Promise.all([
    prisma.supportConversation.count({ where }),
    prisma.supportConversation.count({
      where: { unreadAdminCount: { gt: 0 } },
    }),
    prisma.supportConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // latest message preview
        },
      },
    }),
  ]);

  return {
    conversations: conversations.map((c) => ({
      ...c,
      latestMessage: c.messages[0] || null,
      lastMessageSnippet: c.messages[0] ? (c.messages[0].text || c.messages[0].content) : 'No messages yet',
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      unreadTotal: unreadCount,
    },
  };
};

/**
 * Retrieves full conversation details for an admin.
 */
export const getAdminConversationDetails = async (conversationId) => {
  return prisma.supportConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

/**
 * Bulk deletes conversations by their IDs.
 */
export const deleteConversations = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
  return prisma.supportConversation.deleteMany({
    where: {
      id: { in: ids },
    },
  });
};

