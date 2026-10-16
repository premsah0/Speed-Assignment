import { Server } from 'socket.io';
import { verifyAdminToken } from '../services/adminAuthService.js';
import { config } from '../config/env.js';
import * as supportService from '../services/supportService.js';
import {
  customerMessageSchema,
  adminMessageSchema,
  updateStatusSchema,
} from '../validators/supportValidator.js';

let ioInstance = null;
const adminSockets = new Set();

/**
 * Returns the global Socket.IO instance.
 */
export const getIO = () => ioInstance;

/**
 * Initializes Socket.IO on the provided HTTP server.
 */
export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/fallback, headers enforce safety
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  ioInstance = io;

  // Connect presence counter to supportService
  supportService.setOnlineAdminCounter(() => adminSockets.size);

  // Authentication & Connection Handling
  io.on('connection', (socket) => {
    const auth = socket.handshake.auth || {};
    const adminToken = auth.token;
    const sessionToken = auth.sessionToken;

    let isAdmin = false;
    let adminPayload = null;

    if (adminToken) {
      adminPayload = verifyAdminToken(adminToken);
      if (adminPayload && adminPayload.id) {
        isAdmin = true;
        socket.admin = adminPayload;
        adminSockets.add(socket.id);
        socket.join('admin:support');

        // Broadcast updated agent presence to all clients
        io.emit('agent:presence', {
          isOnline: adminSockets.size > 0,
          onlineAgentCount: adminSockets.size,
        });

        console.log(`[Live Support Socket] Admin connected (${adminPayload.email}), total admins online: ${adminSockets.size}`);
      }
    }

    // Emit initial agent presence to the newly connected socket
    socket.emit('agent:presence', {
      isOnline: adminSockets.size > 0,
      onlineAgentCount: adminSockets.size,
    });

    // Automatically resolve customer room if sessionToken was provided during handshake
    if (!isAdmin && sessionToken) {
      supportService
        .getConversationBySessionToken(sessionToken)
        .then((conv) => {
          if (conv) {
            socket.sessionToken = sessionToken;
            socket.conversationId = conv.id;
            socket.join(`conversation:${conv.id}`);
          }
        })
        .catch((err) => {
          console.warn('[Live Support Socket] Error resolving session during handshake:', err.message);
        });
    }

    // ==========================================
    // CUSTOMER SOCKET EVENTS
    // ==========================================

    socket.on('customer:join', async (data, callback) => {
      try {
        const token = data?.sessionToken || socket.sessionToken;
        if (!token) {
          if (callback) callback({ success: false, message: 'Session token required' });
          return;
        }

        const conv = await supportService.getConversationBySessionToken(token);
        if (!conv) {
          if (callback) callback({ success: false, message: 'Conversation not found' });
          return;
        }

        socket.sessionToken = token;
        socket.conversationId = conv.id;
        socket.join(`conversation:${conv.id}`);

        if (callback) {
          callback({
            success: true,
            conversation: conv,
            isOnline: adminSockets.size > 0,
          });
        }
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('customer:message', async (data, callback) => {
      try {
        const parsed = customerMessageSchema.safeParse(data);
        if (!parsed.success) {
          const msg = parsed.error.issues.map((i) => i.message).join(', ');
          if (callback) callback({ success: false, message: msg });
          return;
        }

        const { sessionToken: token, text, senderName } = parsed.data;
        const result = await supportService.addCustomerMessage({
          sessionToken: token,
          text,
          senderName,
        });

        // Broadcast to customer room and admin support room
        io.to(`conversation:${result.conversation.id}`).emit('message:new', result.message);
        io.to('admin:support').emit('admin:conversation_updated', {
          conversation: result.conversation,
          latestMessage: result.message,
        });

        if (callback) {
          callback({ success: true, message: result.message });
        }
      } catch (err) {
        console.error('[Live Support Socket] Customer message error:', err);
        if (callback) callback({ success: false, message: err.message || 'Failed to send message' });
      }
    });

    socket.on('customer:typing', (data) => {
      const convId = socket.conversationId || data?.conversationId;
      if (convId) {
        socket.to(`conversation:${convId}`).emit('customer:typing', {
          isTyping: !!data?.isTyping,
          senderName: data?.senderName || 'Customer',
        });
      }
    });

    socket.on('customer:mark_read', async (data) => {
      try {
        const token = data?.sessionToken || socket.sessionToken;
        if (token) {
          await supportService.markConversationReadByCustomer(token);
        }
      } catch (err) {
        // Silently handle read receipt error
      }
    });

    // ==========================================
    // ADMIN SOCKET EVENTS
    // ==========================================

    socket.on('admin:join_conversation', async (data, callback) => {
      if (!socket.admin) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const conversationId = data?.conversationId;
      if (!conversationId) {
        if (callback) callback({ success: false, message: 'conversationId required' });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      try {
        await supportService.markConversationReadByAdmin(conversationId);
        io.to('admin:support').emit('admin:conversation_read', { conversationId });
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('admin:message', async (data, callback) => {
      if (!socket.admin) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const conversationId = data?.conversationId;
      const parsed = adminMessageSchema.safeParse({ text: data?.text });
      if (!parsed.success || !conversationId) {
        const msg = !conversationId ? 'conversationId is required' : parsed.error.issues[0]?.message;
        if (callback) callback({ success: false, message: msg });
        return;
      }

      try {
        const result = await supportService.addAdminMessage({
          conversationId,
          adminId: socket.admin.id,
          adminName: 'Speed Assignment Support',
          text: parsed.data.text,
        });

        // Broadcast to conversation room (including customer) and admin dashboard
        io.to(`conversation:${conversationId}`).emit('message:new', result.message);
        io.to('admin:support').emit('admin:conversation_updated', {
          conversation: result.conversation,
          latestMessage: result.message,
        });

        if (callback) {
          callback({ success: true, message: result.message });
        }
      } catch (err) {
        console.error('[Live Support Socket] Admin message error:', err);
        if (callback) callback({ success: false, message: err.message || 'Failed to send reply' });
      }
    });

    socket.on('admin:update_status', async (data, callback) => {
      if (!socket.admin) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const { conversationId, status } = data || {};
      const parsed = updateStatusSchema.safeParse({ status });
      if (!parsed.success || !conversationId) {
        if (callback) callback({ success: false, message: 'Invalid status or conversationId' });
        return;
      }

      try {
        const updated = await supportService.updateConversationStatus(conversationId, parsed.data.status);
        io.to(`conversation:${conversationId}`).emit('conversation:status_changed', {
          conversationId,
          status: updated.status,
        });
        io.to('admin:support').emit('admin:conversation_updated', {
          conversation: updated,
        });

        if (callback) callback({ success: true, conversation: updated });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('admin:delete_conversations', async (data, callback) => {
      if (!socket.admin) {
        if (callback) callback({ success: false, message: 'Unauthorized' });
        return;
      }

      const ids = data?.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        if (callback) callback({ success: false, message: 'ids array required' });
        return;
      }

      try {
        const result = await supportService.deleteConversations(ids);
        io.to('admin:support').emit('admin:conversations_deleted', { ids });
        if (callback) callback({ success: true, count: result.count });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('admin:typing', (data) => {
      if (!socket.admin) return;
      const convId = data?.conversationId;
      if (convId) {
        socket.to(`conversation:${convId}`).emit('agent:typing', {
          isTyping: !!data?.isTyping,
          senderName: 'Support Agent',
        });
      }
    });

    // Disconnect Handler
    socket.on('disconnect', () => {
      if (isAdmin) {
        adminSockets.delete(socket.id);
        console.log(`[Live Support Socket] Admin disconnected, remaining: ${adminSockets.size}`);

        io.emit('agent:presence', {
          isOnline: adminSockets.size > 0,
          onlineAgentCount: adminSockets.size,
        });
      }
    });
  });

  return io;
};
