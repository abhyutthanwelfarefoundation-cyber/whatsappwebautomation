const { verifyAccessToken } = require('../utils/tokenUtils');
const logger = require('../config/logger');

/**
 * Every connected staff member joins a single 'staff' room. Message/status
 * events are broadcast to that room. This is intentionally simple for
 * Phase 3a - assign/transfer-based room scoping (only show a chat to its
 * assigned agent) is a Phase 3b concern once ScheduledMessages/assignment
 * fields are wired up.
 */
function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = verifyAccessToken(token);
      socket.user = { userId: payload.sub, role: payload.role, permissions: payload.permissions || [] };
      next();
    } catch (err) {
      next(new Error('Invalid or expired auth token'));
    }
  });

  io.on('connection', (socket) => {
    if (!socket.user.permissions.includes('whatsapp.view')) {
      socket.disconnect(true);
      return;
    }

    socket.join('staff');
    logger.info('Socket connected', { userId: socket.user.userId, socketId: socket.id });

    socket.on('typing', ({ customerId }) => {
      socket.to('staff').emit('typing', { customerId, byUserId: socket.user.userId });
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: socket.user.userId, socketId: socket.id });
    });
  });
}

module.exports = { initSockets };
