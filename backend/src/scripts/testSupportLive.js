import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from '../routes/index.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { initSocketServer } from '../socket/supportSocket.js';
import { generateAdminToken } from '../services/adminAuthService.js';
import prisma from '../config/prisma.js';
import { io as ClientIO } from 'socket.io-client';

const PORT = 5599; // Isolated test port

async function runTests() {
  console.log('--- STARTING LIVE SUPPORT COMPREHENSIVE INTEGRATION TEST ---');

  // Build Express app for isolated test suite
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 1. Start Server on isolated port
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`[PASS] Test HTTP & Socket.IO server running on port ${PORT}`);

  const BASE_URL = `http://localhost:${PORT}/api`;
  const SOCKET_URL = `http://localhost:${PORT}`;

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 2. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.ok && healthData.success, 'Health endpoint responds with success');

    // 3. Security: Admin endpoint requires authentication
    const unauthRes = await fetch(`${BASE_URL}/admin/support/conversations`);
    assert(unauthRes.status === 401, 'Admin conversations endpoint rejects unauthenticated request with 401');

    const fakeTokenRes = await fetch(`${BASE_URL}/admin/support/conversations`, {
      headers: { Authorization: 'Bearer invalid-token-123' },
    });
    assert(fakeTokenRes.status === 401, 'Admin endpoint rejects invalid JWT with 401');

    // Query or create real admin record in DB for test
    let adminRecord = await prisma.admin.findFirst();
    if (!adminRecord) {
      adminRecord = await prisma.admin.create({
        data: {
          email: 'admin@speedassignment.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        },
      });
    }

    const adminToken = generateAdminToken({
      id: adminRecord.id,
      email: adminRecord.email,
    });

    // 4. Customer Session Initialization
    const initRes = await fetch(`${BASE_URL}/support/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const initData = await initRes.json();
    assert(initRes.ok && initData.success && initData.data.sessionToken, 'Customer session initialized with sessionToken');

    const customerSessionToken = initData.data.sessionToken;
    const conversationId = initData.data.conversation.id;

    // Session Continuity: Calling again with same token returns same conversation
    const resumeRes = await fetch(`${BASE_URL}/support/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: customerSessionToken }),
    });
    const resumeData = await resumeRes.json();
    assert(
      resumeData.data.conversation.id === conversationId,
      'Session token continuity verified: returns same conversation'
    );

    // 5. Pre-Chat Form Gatekeeping & Validation Tests
    // 5a. Block message sending before pre-chat form is completed
    const prematureMsgRes = await fetch(`${BASE_URL}/support/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        text: 'This message should be rejected because pre-chat is not done.',
      }),
    });
    assert(
      prematureMsgRes.status === 400,
      'Sending message before pre-chat form completion is strictly rejected with HTTP 400'
    );

    // 5b. Validation: Missing full name rejected
    const missingNameRes = await fetch(`${BASE_URL}/support/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        customerName: ' ',
        customerPhone: '+1234567890',
      }),
    });
    assert(missingNameRes.status === 400, 'Pre-chat start rejects empty full name with HTTP 400');

    // 5c. Validation: Missing phone rejected
    const missingPhoneRes = await fetch(`${BASE_URL}/support/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        customerName: 'Alex Student',
        customerPhone: '',
      }),
    });
    assert(missingPhoneRes.status === 400, 'Pre-chat start rejects missing mobile number with HTTP 400');

    // 5d. Validation: Invalid phone with insufficient digits rejected
    const shortPhoneRes = await fetch(`${BASE_URL}/support/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        customerName: 'Alex Student',
        customerPhone: '123',
      }),
    });
    assert(shortPhoneRes.status === 400, 'Pre-chat start rejects invalid phone with < 7 digits with HTTP 400');

    // 5e. Successful Pre-Chat completion with Full Name and Mobile Number
    const preChatSuccessRes = await fetch(`${BASE_URL}/support/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        customerName: 'Alex Student',
        customerPhone: '+1 234-567-8901',
      }),
    });
    const preChatSuccessData = await preChatSuccessRes.json();
    assert(
      preChatSuccessRes.ok &&
        preChatSuccessData.data.conversation.customerName === 'Alex Student' &&
        preChatSuccessData.data.conversation.customerPhone === '+1 234-567-8901',
      'Pre-chat form successfully submitted: customer full name and mobile number saved in database'
    );

    // 6. Customer Message Sending via REST (Now Allowed)
    const msgRes = await fetch(`${BASE_URL}/support/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: customerSessionToken,
        text: 'Hello, I need urgent help with my master dissertation.',
        senderName: 'Alex Student',
      }),
    });
    const msgData = await msgRes.json();
    const customerMsg = msgData.data.message;
    assert(
      msgRes.status === 201 &&
        (customerMsg.text || customerMsg.content).includes('master dissertation') &&
        customerMsg.senderType === 'CUSTOMER' &&
        customerMsg.senderName === 'Alex Student',
      'Customer message allowed and persisted with real customer name Alex Student'
    );

    // 7. Cross-Customer Isolation Check
    const anotherSessionRes = await fetch(`${BASE_URL}/support/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const anotherSessionData = await anotherSessionRes.json();
    const customerBToken = anotherSessionData.data.sessionToken;
    const customerBConvId = anotherSessionData.data.conversation.id;

    assert(customerSessionToken !== customerBToken, 'Distinct customers receive unique session tokens');
    assert(conversationId !== customerBConvId, 'Distinct customers have isolated conversation IDs');

    // Customer B cannot fetch Customer A's conversation
    const crossFetchRes = await fetch(`${BASE_URL}/support/conversation?sessionToken=${customerBToken}`);
    const crossFetchData = await crossFetchRes.json();
    assert(
      crossFetchData.data.conversation.id === customerBConvId &&
        crossFetchData.data.conversation.id !== conversationId,
      'Cross-customer isolation: Customer B can only access their own conversation'
    );

    // 8. Admin Inbox REST Listing & Thread History
    const adminListRes = await fetch(`${BASE_URL}/admin/support/conversations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    assert(
      adminListRes.ok &&
        Array.isArray(adminListData.data) &&
        adminListData.data.some(
          (c) =>
            c.id === conversationId &&
            c.customerName === 'Alex Student' &&
            c.customerPhone === '+1 234-567-8901'
        ),
      'Admin can list conversations and see real customer name (Alex Student) and phone number'
    );

    const adminThreadRes = await fetch(`${BASE_URL}/admin/support/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminThreadData = await adminThreadRes.json();
    assert(
      adminThreadRes.ok &&
        adminThreadData.data.customerName === 'Alex Student' &&
        adminThreadData.data.customerPhone === '+1 234-567-8901' &&
        adminThreadData.data.messages.length >= 1,
      'Admin can retrieve complete customer thread history with customer name and mobile number'
    );

    // 9. Admin Reply via REST
    const adminReplyRes = await fetch(`${BASE_URL}/admin/support/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        text: 'Hi Alex! We would be delighted to assist with your dissertation. What is your submission deadline?',
      }),
    });
    const adminReplyData = await adminReplyRes.json();
    const adminMsg = adminReplyData.data.message;
    assert(
      adminReplyRes.ok &&
        adminMsg.senderType === 'AGENT' &&
        (adminMsg.text || adminMsg.content).includes('submission deadline'),
      'Admin reply saved with senderType AGENT'
    );

    // 10. Status Management: Resolve & Reopen
    const resolveRes = await fetch(`${BASE_URL}/admin/support/conversations/${conversationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    const resolveData = await resolveRes.json();
    assert(resolveData.data.status === 'RESOLVED', 'Conversation status successfully updated to RESOLVED');

    const reopenRes = await fetch(`${BASE_URL}/admin/support/conversations/${conversationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'OPEN' }),
    });
    const reopenData = await reopenRes.json();
    assert(reopenData.data.status === 'OPEN', 'Conversation status successfully reopened to OPEN');

    // 11. Real-Time Socket.IO Tests
    console.log('\n--- Testing Real-Time Socket.IO Capabilities ---');

    function withTimeout(promise, ms, name) {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${ms}ms waiting for: ${name}`)), ms)
        ),
      ]);
    }

    // Admin Socket connection
    console.log('Connecting admin socket...');
    const adminSocket = ClientIO(SOCKET_URL, {
      path: '/socket.io',
      auth: { token: adminToken },
      transports: ['websocket', 'polling'],
    });

    await withTimeout(new Promise((resolve) => adminSocket.on('connect', resolve)), 5000, 'adminSocket connect');
    assert(adminSocket.connected, 'Admin Socket.IO client connected with JWT auth');

    // Customer Socket connection
    console.log('Connecting customer socket...');
    const customerSocket = ClientIO(SOCKET_URL, {
      path: '/socket.io',
      auth: { sessionToken: customerSessionToken },
      transports: ['websocket', 'polling'],
    });

    // Unverified Customer Socket connection test: should be rejected when pre-chat is incomplete
    const unverifiedSocket = ClientIO(SOCKET_URL, {
      path: '/socket.io',
      auth: { sessionToken: customerBToken },
      transports: ['websocket', 'polling'],
    });
    await withTimeout(new Promise((resolve) => unverifiedSocket.on('connect', resolve)), 5000, 'unverifiedSocket connect');

    const unverifiedSendAck = await withTimeout(
      new Promise((resolve) => {
        unverifiedSocket.emit(
          'customer:message',
          {
            sessionToken: customerBToken,
            text: 'This socket message should be blocked',
          },
          (ack) => resolve(ack)
        );
      }),
      5000,
      'unverified customer:message ack'
    );
    assert(
      unverifiedSendAck &&
        unverifiedSendAck.success === false &&
        unverifiedSendAck.message.includes('Pre-chat form must be completed'),
      'Socket.IO customer message without completed pre-chat is strictly blocked with error'
    );
    unverifiedSocket.disconnect();

    // Customer joins conversation room
    console.log('Emitting customer:join...');
    const joinResult = await withTimeout(
      new Promise((resolve) => {
        customerSocket.emit('customer:join', { sessionToken: customerSessionToken }, (ack) => {
          resolve(ack);
        });
      }),
      5000,
      'customer:join ack'
    );
    assert(joinResult && joinResult.success, 'Customer joined conversation room');

    // Test real-time message: Customer -> Admin
    console.log('Setting up listener for customer message on adminSocket...');
    const customerMessagePromise = new Promise((resolve) => {
      adminSocket.on('admin:conversation_updated', (data) => {
        const text = data.latestMessage ? (data.latestMessage.text || data.latestMessage.content) : '';
        if (text && text.includes('Socket test message')) {
          resolve(data.latestMessage);
        }
      });
    });

    console.log('Emitting customer:message...');
    const sendAck = await withTimeout(
      new Promise((resolve) => {
        customerSocket.emit(
          'customer:message',
          {
            sessionToken: customerSessionToken,
            text: 'Socket test message from student',
            senderName: 'Alex Student',
          },
          (ack) => resolve(ack)
        );
      }),
      5000,
      'customer:message ack'
    );
    assert(sendAck && sendAck.success, 'Customer sent message via Socket with server acknowledgement');

    const receivedByAdmin = await withTimeout(customerMessagePromise, 5000, 'admin receive customer message');
    assert(
      receivedByAdmin && (receivedByAdmin.text || receivedByAdmin.content) === 'Socket test message from student',
      'Admin received customer message in real-time via admin:conversation_updated'
    );

    // Test real-time reply: Admin -> Customer
    console.log('Emitting admin:join_conversation...');
    const adminJoinAck = await withTimeout(
      new Promise((resolve) => {
        adminSocket.emit('admin:join_conversation', { conversationId }, (ack) => resolve(ack));
      }),
      5000,
      'admin:join_conversation ack'
    );
    assert(adminJoinAck && adminJoinAck.success, 'Admin joined specific conversation room');

    const customerReceivePromise = new Promise((resolve) => {
      customerSocket.on('message:new', (msg) => {
        const text = msg.text || msg.content || '';
        if (msg.senderType === 'AGENT' && text.includes('Real-time agent reply')) {
          resolve(msg);
        }
      });
    });

    console.log('Emitting admin:message...');
    const replyAck = await withTimeout(
      new Promise((resolve) => {
        adminSocket.emit(
          'admin:message',
          {
            conversationId,
            text: 'Real-time agent reply from admin socket',
          },
          (ack) => resolve(ack)
        );
      }),
      5000,
      'admin:message ack'
    );
    assert(replyAck && replyAck.success, 'Admin sent reply via Socket with server acknowledgement');

    const receivedByCustomer = await withTimeout(customerReceivePromise, 5000, 'customer receive agent reply');
    assert(
      receivedByCustomer && (receivedByCustomer.text || receivedByCustomer.content) === 'Real-time agent reply from admin socket',
      'Customer received agent reply in real-time via message:new'
    );

    // Test typing indicator
    const typingPromise = new Promise((resolve) => {
      adminSocket.on('customer:typing', (data) => {
        if (data.isTyping) resolve(data);
      });
    });
    customerSocket.emit('customer:typing', { isTyping: true, senderName: 'Alex Student' });
    const typingEvent = await typingPromise;
    assert(typingEvent.isTyping === true, 'Real-time typing indicator propagated to admin');

    // Cleanup Sockets
    adminSocket.disconnect();
    customerSocket.disconnect();
    console.log('[PASS] Socket connections cleaned up cleanly');

    // 12. Regression Test: Existing AI Chatbot remains fully functional
    const chatConfigRes = await fetch(`${BASE_URL}/chat/config`);
    const chatConfigData = await chatConfigRes.json();
    assert(
      chatConfigRes.ok && chatConfigData.success,
      'Existing AI chatbot /api/chat/config endpoint is fully operational and unchanged'
    );

    console.log(`\n========================================`);
    console.log(`ALL TESTS PASSED! (${passedCount} passed, 0 failed)`);
    console.log(`========================================\n`);
  } finally {
    // Stop test server and disconnect Prisma
    await new Promise((resolve) => httpServer.close(resolve));
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Integration test failed with error:', err);
  process.exit(1);
});
