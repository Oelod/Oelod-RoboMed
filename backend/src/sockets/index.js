const jwt = require('jsonwebtoken');
const emitter = require('../events/emitter');
const { client: redis } = require('../utils/redisClient');

module.exports = (io) => {
  // Listen for internal chat events to broadcast to specific case rooms
  emitter.on('chat.message_sent', ({ conversationId, message, participants }) => {
    io.to(`conversation_${conversationId}`).emit('chat.message', { conversationId, message });
  });

  emitter.on('chat.message_updated', ({ conversationId, messageId, text }) => {
    io.to(`conversation_${conversationId}`).emit('chat.message_update', { messageId, text });
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token && socket.handshake.headers.cookie) {
        const match = socket.handshake.headers.cookie.match(/(?:^|; )RoboMed_Access=([^;]*)/);
        if (match) token = match[1];
      }

      if (!token) return next(new Error('Authentication error: No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; 
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user._id}`);
    
    // Industrial Presence: Mark user as online
    redis.sAdd('online_users', socket.user._id.toString()).catch(() => {});
    io.emit('user_presence', { userId: socket.user._id, status: 'online' });

    const userIdString = socket.user._id.toString();
    socket.join(userIdString);
    
    if (socket.user.roles.includes('doctor')) {
      socket.on('join_specialty', (specialty) => {
        if (specialty) socket.join(`specialty_${specialty}`);
      });
    }

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) socket.join(`conversation_${conversationId}`);
    });

    socket.on('join_case', (caseId) => {
      if (caseId) socket.join(`case_${caseId}`);
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('user_typing', { senderId: socket.user._id, isTyping });
      }
    });

    socket.on('call_initiate', ({ caseId, targetUserId }) => {
      const target = String(targetUserId);
      io.to(target).emit('call_incoming', { 
        caseId, 
        callerId: userIdString, 
        callerName: socket.user.fullName || 'Clinical Specialist'
      });
    });

    socket.on('call_signal', ({ targetUserId, signalData }) => {
      const target = String(targetUserId);
      io.to(target).emit('call_signal_received', { senderId: socket.user._id, signalData });
    });

    socket.on('call_terminate', ({ targetUserId, caseId, wasAccepted }) => {
      const target = String(targetUserId);
      io.to(target).emit('call_disconnected');
      
      if (socket.user.roles.includes('doctor') && !wasAccepted && caseId) {
        const Case = require('../models/Case');
        Case.findByIdAndUpdate(caseId, {
          $push: { timeline: { 
            event: 'missed_consultation', 
            actorId: socket.user._id, 
            note: 'Statutory Notification: Clinical Video Consultation was attempted but not answered.' 
          }}
        }).exec().catch(() => {});
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user._id}`);
      redis.sRem('online_users', socket.user._id.toString()).catch(() => {});
      io.emit('user_presence', { userId: socket.user._id, status: 'offline' });
    });
  });
};
