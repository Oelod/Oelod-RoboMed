const chatService = require('../services/chatService');
const res_ = require('../utils/apiResponse');

const getOrCreateConversation = async (req, res) => {
  const { caseId } = req.body;
  if (!caseId) { return res_.error(res, 'caseId is required', 400); }
  const conv = await chatService.getOrCreateConversation(caseId, req.user._id);
  return res_.success(res, { conversation: conv }, 'Conversation retrieved');
};

const getMessages = async (req, res) => {
  const msgs = await chatService.getMessages(req.params.conversationId, req.user._id);
  return res_.success(res, { messages: msgs }, 'Messages fetched');
};

const sendMessage = async (req, res) => {
  const { text, attachments } = req.body;
  if (!text && (!attachments || attachments.length === 0)) {
    return res_.error(res, 'Message text or attachments required', 400);
  }
  const msg = await chatService.sendMessage(req.params.conversationId, req.user._id, text, attachments);
  return res_.success(res, { message: msg }, 'Message sent');
};

const sendAudioMessage = async (req, res) => {
  if (!req.file) return res_.error(res, 'Audio file is required', 400);
  const msg = await chatService.sendAudioMessage(req.params.conversationId, req.user._id, req.file.buffer);
  return res_.success(res, { message: msg }, 'Voice note sent');
};

const markAsRead = async (req, res) => {
  await chatService.markAsRead(req.params.conversationId, req.user._id);
  return res_.success(res, null, 'Messages marked as read');
};

module.exports = {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  sendAudioMessage,
  markAsRead
};
