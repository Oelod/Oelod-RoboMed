import api from './axiosInstance';

export const getOrCreateConversation = async (caseId) => {
  const res = await api.post('/chat/conversations', { caseId });
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/chat/conversations/${conversationId}/messages`);
  return res.data;
};

export const sendMessage = async (conversationId, text, attachments = []) => {
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, { text, attachments });
  return res.data;
};

export const sendVoiceMessage = async (conversationId, audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice_note.webm');
  const res = await api.post(`/chat/conversations/${conversationId}/messages/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const markChatAsRead = async (conversationId) => {
  const res = await api.patch(`/chat/conversations/${conversationId}/read`);
  return res.data;
};
