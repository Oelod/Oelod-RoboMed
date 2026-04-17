import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { getOrCreateConversation, getMessages, sendMessage, sendVoiceMessage, markChatAsRead } from '../api/chat';

export default function ChatPanel({ caseId, status }) {
  const { user } = useAuthContext();
  const { socket } = useSocketContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const isClosed = status === 'closed';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        const convRes = await getOrCreateConversation(caseId);
        setConversation(convRes.data.conversation);
        const msgRes = await getMessages(convRes.data.conversation._id);
        setMessages(msgRes.data.messages);
        setLoading(false);
        // Mark as read once loaded
        markChatAsRead(convRes.data.conversation._id);
      } catch (err) {
        console.error('Chat init error:', err);
        setLoading(false);
      }
    };
    initChat();
  }, [caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket || !conversation) return;

    // Join the specific conversation room for real-time updates
    socket.emit('join_conversation', conversation._id);

    const handleMessage = (payload) => {
      // payload: { conversationId, message }
      if (payload.conversationId === conversation._id) {
        setMessages(prev => {
          // Prevent duplicates if sender also received their own broadcast via socket (depending on IO config)
          if (prev.find(m => m._id === payload.message._id)) return prev;
          return [...prev, payload.message];
        });
        
        if (payload.message.sender._id !== user._id) {
           markChatAsRead(conversation._id);
        }
      }
    };

    const handleMessageUpdate = (payload) => {
      // payload: { messageId, text }
      setMessages(prev => prev.map(m => m._id === payload.messageId ? { ...m, text: payload.text } : m));
    };

    socket.on('chat.message', handleMessage);
    socket.on('chat.message_update', handleMessageUpdate);

    return () => {
      socket.off('chat.message', handleMessage);
      socket.off('chat.message_update', handleMessageUpdate);
      // Optional: leave room if needed, but not strictly necessary for SPAs
    };
  }, [socket, conversation, user._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || isClosed) return;

    setSending(true);
    try {
      await sendMessage(conversation._id, text.trim());
      setText('');
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !conversation) return;

    socket.on('user_typing', ({ senderId, isTyping: remoteIsTyping }) => {
      if (senderId !== user._id) {
        setIsTyping(remoteIsTyping);
      }
    });

    return () => socket.off('user_typing');
  }, [socket, conversation, user._id]);

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !conversation) return;

    socket.emit('typing', { conversationId: conversation._id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: conversation._id, isTyping: false });
    }, 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setSending(true);
        try {
          await sendVoiceMessage(conversation._id, audioBlob);
        } catch (err) {
          alert('Failed to send voice note');
        } finally {
          setSending(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Loading chat...</div>;
  if (!conversation) return <div className="p-4 text-center text-red-500">Chat unavailable.</div>;

  return (
    <div className="flex flex-col h-[500px] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-gray-500' : 'bg-green-500'}`}></span>
          Clinical Consultation
        </h3>
        {isTyping && (
          <span className="text-[10px] text-brand-400 font-bold animate-pulse uppercase tracking-widest">
            Specialist is typing...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-gray-500 text-sm italic">Secure medical consultation channel established. Your messages are private and logged to the case timeline.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender._id === user._id;
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
              }`}>
                {!isMe && <p className="text-[10px] font-bold text-brand-400 mb-1 uppercase tracking-tighter">{msg.sender.fullName}</p>}
                {msg.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                {msg.attachments?.map((at, idx) => (
                   <div key={idx} className="mt-2">
                      {at.mimeType?.startsWith('audio') ? (
                         <audio 
                            src={at.fileUrl} 
                            controls 
                            className={`h-8 w-48 rounded-lg custom-audio-player transition-opacity opacity-80 hover:opacity-100 ${isMe ? 'mix-blend-lighten' : ''}`} 
                         />
                      ) : (
                         <a href={at.fileUrl} target="_blank" rel="noreferrer" className="text-xs underline block">Attachment {idx+1}</a>
                      )}
                   </div>
                ))}
                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-brand-200' : 'text-gray-500'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {!isClosed ? (
        <form onSubmit={handleSend} className="p-3 bg-gray-950/30 border-t border-gray-800 flex gap-2 items-center">
          {isRecording ? (
             <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                   <span className="text-xs font-black text-red-500 uppercase tracking-widest">Recording... {formatDuration(recordingDuration)}</span>
                </div>
                <button type="button" onClick={stopRecording} className="text-red-500 font-black text-[10px] uppercase hover:underline">Stop & Send</button>
             </div>
          ) : (
            <>
              <input 
                type="text" 
                value={text}
                onChange={handleTyping}
                placeholder="Type a clinical note..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                disabled={sending}
              />
              <button 
                type="button"
                onClick={startRecording}
                disabled={sending || !!text.trim()}
                className="w-10 h-10 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 transition-all"
                title="Voice Note"
              >
                🎙️
              </button>
              <button 
                type="submit"
                disabled={!text.trim() || sending}
                className="w-10 h-10 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-all shadow-lg shadow-brand-900/20"
              >
                {sending ? '...' : '🚀'}
              </button>
            </>
          )}
        </form>
      ) : (
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500 font-medium italic">Case is closed. Consultation history is read-only.</p>
        </div>
      )}
    </div>
  );
}
