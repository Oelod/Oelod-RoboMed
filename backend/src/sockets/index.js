const jwt = require('jsonwebtoken');
const emitter = require('../events/emitter');

module.exports = (io) => {
  // Listen for internal chat events to broadcast to specific case rooms
  emitter.on('chat.message_sent', ({ conversationId, message, participants }) => {
    // Broadcast to the conversation room
    io.to(`conversation_${conversationId}`).emit('chat.message', { conversationId, message });
  });

  emitter.on('chat.message_updated', ({ conversationId, messageId, text }) => {
    // Broadcast text updates (primarily for AI transcriptions)
    io.to(`conversation_${conversationId}`).emit('chat.message_update', { messageId, text });
  });
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      
      // Fallback for cookie parsing if needed
      if (!token && socket.handshake.headers.cookie) {
        const match = socket.handshake.headers.cookie.match(/(?:^|; )RoboMed_Access=([^;]*)/);
        if (match) token = match[1];
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, roles, activeRole }
      
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user._id}`);
    
    // Join a personal room based on user ID for direct notifications (Force string for predictability)
    const userIdString = socket.user._id.toString();
    socket.join(userIdString);
    
    // If the user is a doctor, they can also join specialty rooms to receive broadcasting of new cases
    if (socket.user.roles.includes('doctor')) {
      // (Optional: fetch doctor details here or let client emit their specialty to join a room)
      socket.on('join_specialty', (specialty) => {
        if (specialty) {
           socket.join(`specialty_${specialty}`);
           console.log(`[Socket] Doctor ${userIdString} joined specialty_${specialty}`);
        }
      });
    }

    // --- Chat Handlers (Phase 5) ---
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
        console.log(`[Socket] User ${userIdString} joined conversation room: ${conversationId}`);
      }
    });

    socket.on('join_case', (caseId) => {
      if (caseId) {
        socket.join(`case_${caseId}`);
        console.log(`[Socket] User ${userIdString} joined case room: ${caseId}`);
      }
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('user_typing', { senderId: socket.user._id, isTyping });
      }
    });

    // --- Telemedicine Signaling (Phase 12) ---
    // Initiate clinical consultation (Doctor rings Patient)
    socket.on('call_initiate', ({ caseId, targetUserId }) => {
      const target = String(targetUserId);
      console.log(`[Telemed] Statutory Call Initiation Triggered: ${userIdString} -> ${target} (Case: ${caseId})`);
      io.to(target).emit('call_incoming', { 
        caseId, 
        callerId: userIdString, 
        callerName: socket.user.fullName || 'Clinical Specialist'
      });
    });

    // Relay WebRTC signals (Offers, Answers, ICE Candidates)
    socket.on('call_signal', ({ targetUserId, signalData }) => {
      const target = String(targetUserId);
      io.to(target).emit('call_signal_received', { 
        senderId: socket.user._id, 
        signalData 
      });
    });

    socket.on('call_terminate', ({ targetUserId, caseId, wasAccepted }) => {
      const target = String(targetUserId);
      io.to(target).emit('call_disconnected');
      
      // If the doctor hung up before an answer, it's a "Missed Call"
      if (socket.user.roles.includes('doctor') && !wasAccepted && caseId) {
        const Case = require('../models/Case');
        Case.findByIdAndUpdate(caseId, {
          $push: { timeline: { 
            event: 'missed_consultation', 
            actorId: socket.user._id, 
            note: 'Statutory Notification: Clinical Video Consultation was attempted but not answered.' 
          }}
        }).exec().catch(err => console.error('[Socket] Failed to log missed call:', err));
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user._id}`);
    });
  });
};
