import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

export default function AiSandbox() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [caseId, setCaseId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const autoDetectUser = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user) setUserName(response.data.user.fullName);
      } catch (err) {}
    };
    autoDetectUser();
  }, []);

  const initSession = async (e) => {
    if (e) e.preventDefault();
    if (!userName.trim()) return;
    setIsTyping(true);
    setError(null);
    try {
      const response = await api.post('/ai-experiment/start', { userName });
      const data = response.data;
      if (data.success) {
        setCaseId(data.caseId);
        let text = data.text;
        if (typeof text === 'object') text = text.content || text.message || JSON.stringify(text);
        setMessages([{ role: 'assistant', text: text }]);
        setIsInitialized(true);
      }
    } catch (err) {
      setError("Institutional Link Failure.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !caseId) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/api/ai-experiment/interact', { caseId, text: userText });
      const data = response.data;
      if (data.success) {
        const res = data.response;
        let msg = typeof res === 'string' ? res : (res.explanation || res.content || JSON.stringify(res));
        if (typeof msg === 'object') msg = msg.message || msg.content || JSON.stringify(msg);
        
        setMessages(prev => [...prev, { role: 'assistant', text: msg }]);

        if (res.type === 'clerkship_final') {
          setTimeout(() => navigate('/dashboard'), 3000); 
        }
      }
    } catch (err) {
      setError("Conversational Link Broken.");
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-32 h-16 flex items-center justify-center p-1">
               <img src="/oelod_logo_official.png" className="max-w-full max-h-full object-contain" alt="Oelod Official" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none text-brand-500">Oelod Virtual Resident</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-1">Clinical Intake Manifold</p>
            </div>
          </div>
          {isInitialized && (
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Live Handshake</span>
            </div>
          )}
        </div>

        {!isInitialized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-3xl mb-6">👤</div>
            <h2 className="text-xl font-black text-white mb-2">Initialize Session</h2>
            <p className="text-sm text-gray-500 mb-8">Please provide your name to begin the clinical engagement.</p>
            {error && <div className="text-red-500 text-xs mb-4">⚠️ {error}</div>}
            <form onSubmit={initSession} className="w-full max-w-sm space-y-4">
              <input 
                type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name"
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-6 py-4 text-white text-center outline-none"
              />
              <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-2xl">Authenticate & Start</button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-850 text-gray-300'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-gray-500 text-xs animate-pulse">O.V.R. is thinking...</div>}
              <div ref={scrollRef} />
            </div>
            <form onSubmit={handleSend} className="p-6 bg-black/20 border-t border-gray-800 flex gap-4">
              <input 
                type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type details..." disabled={isTyping}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white"
              />
              <button type="submit" className="p-3 bg-brand-600 text-white rounded-xl">🚀</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
