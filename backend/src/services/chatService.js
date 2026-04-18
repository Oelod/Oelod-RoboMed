const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Case = require('../models/Case');
const emitter = require('../events/emitter');

const getOrCreateConversation = async (caseId, userId) => {
  const c = await Case.findById(caseId);
  if (!c) {
    const e = new Error('Case not found'); e.statusCode = 404; throw e;
  }
  // Verify access
  if (c.patient.toString() !== userId.toString() && c.doctor?.toString() !== userId.toString()) {
    const e = new Error('Only the assigned doctor and patient can access this chat'); e.statusCode = 403; throw e;
  }

  let conv = await Conversation.findOne({ caseId }).populate('participants', 'fullName role profilePicture publicKey');
  if (!conv) {
    const participants = [c.patient];
    if (c.doctor) participants.push(c.doctor);
    
    conv = await (await Conversation.create({ caseId, participants })).populate('participants', 'fullName role profilePicture publicKey');
  }
  return conv;
};

const getMessages = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId);
  const isParticipant = conv?.participants.some(p => p.toString() === userId.toString());
  if (!conv || !isParticipant) {
    const e = new Error('Not authorized to view these messages'); e.statusCode = 403; throw e;
  }
  return await Message.find({ conversationId }).sort('createdAt').populate('sender', 'fullName role profilePicture publicKey');
};

const { uploadToCloudinary } = require('../utils/uploadFile');

const sendMessage = async (conversationId, senderId, text, attachments = [], isEncrypted = false) => {
  const conv = await Conversation.findById(conversationId).populate('caseId');
  if (!conv) { const e = new Error('Conversation not found'); e.statusCode = 404; throw e; }
  
  if (conv.caseId?.status === 'closed') {
    const e = new Error('Cannot send messages to a closed case'); e.statusCode = 400; throw e;
  }

  const isParticipant = conv.participants.some(p => p.toString() === senderId.toString());
  if (!isParticipant) {
    const e = new Error('Not authorized to send messages here'); e.statusCode = 403; throw e;
  }

  const msg = await (await Message.create({
    conversationId,
    sender: senderId,
    text,
    isEncrypted,
    attachments,
    readBy: [senderId] // sender has read it
  })).populate('sender', 'fullName role profilePicture publicKey');

  conv.lastMessage = msg._id;
  await conv.save();

  emitter.emit('chat.message_sent', { conversationId, message: msg, participants: conv.participants });

  return msg;
};

const aiService = require('./aiService');

const sendAudioMessage = async (conversationId, senderId, fileBuffer) => {
  const conv = await Conversation.findById(conversationId).populate('caseId');
  if (!conv) { const e = new Error('Conversation not found'); e.statusCode = 404; throw e; }
  
  if (conv.caseId?.status === 'closed') {
    const e = new Error('Cannot send messages to a closed case'); e.statusCode = 400; throw e;
  }

  const isParticipant = conv.participants.some(p => p.toString() === senderId.toString());
  if (!isParticipant) {
    const e = new Error('Not authorized to send messages here'); e.statusCode = 403; throw e;
  }

  const cloudinaryRes = await uploadToCloudinary(fileBuffer, 'robomed/consultations/audio');
  
  const msg = await (await Message.create({
    conversationId,
    sender: senderId,
    text: '[Transcribing Voice Note...]', // Placeholder
    isEncrypted: false, // Transcripts are usually plaintext by background AI
    attachments: [{ fileUrl: cloudinaryRes.fileUrl, mimeType: 'audio/webm' }],
    readBy: [senderId]
  })).populate('sender', 'fullName role profilePicture publicKey');

  conv.lastMessage = msg._id;
  await conv.save();

  emitter.emit('chat.message_sent', { conversationId, message: msg, participants: conv.participants });

  // Trigger transcription in background
  aiService.transcribe(cloudinaryRes.fileUrl).then(data => {
    let finalTranscript = '[Transcription Unclear]';
    if (data && data.text) {
      finalTranscript = `[Voice Transcript]: ${data.text}`;
    }
    
    Message.updateOne({ _id: msg._id }, { text: finalTranscript }).then(() => {
      emitter.emit('chat.message_updated', { 
        conversationId, 
        messageId: msg._id, 
        text: finalTranscript 
      });
    });
  }).catch(err => {
    console.error('[AI] Transcription background error:', err.message);
    const errorTranscript = '[Transcription Unavailable]';
    Message.updateOne({ _id: msg._id }, { text: errorTranscript }).then(() => {
      emitter.emit('chat.message_updated', { 
        conversationId, 
        messageId: msg._id, 
        text: errorTranscript 
      });
    });
  });

  return msg;
};

const markAsRead = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId);
  const isParticipant = conv?.participants.some(p => p.toString() === userId.toString());
  if (!conv || !isParticipant) {
    const e = new Error('Not authorized'); e.statusCode = 403; throw e;
  }

  await Message.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $push: { readBy: userId } }
  );
};

module.exports = {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  sendAudioMessage,
  markAsRead
};
