import * as supportService from '../services/supportService.js';
import { getIO } from '../socket/supportSocket.js';

export const initSession = async (req, res, next) => {
  try {
    const { sessionToken, customerName, customerEmail, customerPhone } = req.body || {};
    const { conversation, isNew } = await supportService.getOrCreateConversation({
      sessionToken,
      customerName,
      customerEmail,
      customerPhone,
    });

    const status = supportService.getOnlineAgentStatus();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        sessionToken: conversation.sessionToken,
        isNew,
        agentStatus: status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const startPreChat = async (req, res, next) => {
  try {
    const { sessionToken, customerName, customerPhone, customerEmail } = req.body;
    const { conversation, isNew } = await supportService.startCustomerConversation({
      sessionToken,
      customerName,
      customerPhone,
      customerEmail,
    });

    const status = supportService.getOnlineAgentStatus();

    const io = getIO();
    if (io) {
      io.to('admin:support').emit('admin:conversation_updated', {
        conversation,
        isNew,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        sessionToken: conversation.sessionToken,
        isNew,
        agentStatus: status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const token = req.query.sessionToken || req.headers['x-session-token'];
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'sessionToken is required',
      });
    }

    const conversation = await supportService.getConversationBySessionToken(token);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const status = supportService.getOnlineAgentStatus();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        agentStatus: status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { sessionToken, text, senderName } = req.body;
    const result = await supportService.addCustomerMessage({
      sessionToken,
      text,
      senderName,
    });

    // Broadcast in real-time if Socket.IO is initialized
    const io = getIO();
    if (io) {
      io.to(`conversation:${result.conversation.id}`).emit('message:new', result.message);
      io.to('admin:support').emit('admin:conversation_updated', {
        conversation: result.conversation,
        latestMessage: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAgentStatus = (req, res) => {
  const status = supportService.getOnlineAgentStatus();
  return res.status(200).json({
    success: true,
    data: status,
  });
};

export const updateContact = async (req, res, next) => {
  try {
    const { sessionToken, customerName, customerEmail, customerPhone } = req.body;
    const conversation = await supportService.updateCustomerContact({
      sessionToken,
      customerName,
      customerEmail,
      customerPhone,
    });

    const io = getIO();
    if (io) {
      io.to('admin:support').emit('admin:conversation_updated', { conversation });
    }

    return res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const token = req.body.sessionToken || req.query.sessionToken || req.headers['x-session-token'];
    if (!token) {
      return res.status(400).json({ success: false, message: 'sessionToken required' });
    }

    await supportService.markConversationReadByCustomer(token);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
