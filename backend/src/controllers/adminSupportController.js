import * as supportService from '../services/supportService.js';
import { getIO } from '../socket/supportSocket.js';

export const listConversations = async (req, res, next) => {
  try {
    const { status, search, page, limit } = req.query;
    const result = await supportService.listConversationsForAdmin({
      status,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.conversations,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await supportService.getAdminConversationDetails(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Automatically mark read by admin
    await supportService.markConversationReadByAdmin(id);

    const io = getIO();
    if (io) {
      io.to('admin:support').emit('admin:conversation_read', { conversationId: id });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const sendReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const result = await supportService.addAdminMessage({
      conversationId: id,
      adminId: req.admin.id,
      adminName: 'Speed Assignment Support',
      text,
    });

    const io = getIO();
    if (io) {
      io.to(`conversation:${id}`).emit('message:new', result.message);
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

export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const conversation = await supportService.updateConversationStatus(id, status);

    const io = getIO();
    if (io) {
      io.to(`conversation:${id}`).emit('conversation:status_changed', {
        conversationId: id,
        status: conversation.status,
      });
      io.to('admin:support').emit('admin:conversation_updated', {
        conversation,
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supportService.markConversationReadByAdmin(id);

    const io = getIO();
    if (io) {
      io.to('admin:support').emit('admin:conversation_read', { conversationId: id });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversations = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const result = await supportService.deleteConversations(ids);

    const io = getIO();
    if (io) {
      io.to('admin:support').emit('admin:conversations_deleted', { ids });
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.count} conversation(s)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

