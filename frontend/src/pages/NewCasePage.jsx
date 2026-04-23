import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axiosInstance';

export default function NewCasePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseId, setCaseId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Auto-initialize O.V.R. session on mount
  useEffect(() => {
    if (user && !isInitialized) {
      initSession();
    }
  }, [user]);

  const initSession = async () => {
    setIsTyping(true);
    setError(null);
    try {
      const response = await api.post('/ai-experiment/start', { userName: user.fullName });
      const data = response.data;
      if (data.success) {
        setCaseId(data.caseId);
        let text = data.text;
        if (typeof text === 'object') text = text.content || text.message || JSON.stringify(text);
        setMessages([{ role: 'assistant', text: text }]);
        setIsInitialized(true);
      }
    } catch (err) {
      setError("System connection error.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || !caseId || isTyping) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai-experiment/interact', { caseId, text: userText });
      const data = response.data;
      
      if (data.success) {
        const res = data.response;
        let msg = typeof res === 'string' ? res : (res.explanation || res.content || JSON.stringify(res));
        if (typeof msg === 'object') msg = msg.message || msg.content || JSON.stringify(msg);
        
        setMessages(prev => [...prev, { role: 'assistant', text: msg }]);

        if (res.type === 'clerkship_final') {
          // Mark as final for the overlay and show the manual proceed button
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].isFinal = true;
            newMsgs[newMsgs.length - 1].caseDbId = res.caseDbId;
            return newMsgs;
          });
          // Reduce redirect timer for snappier feel
          setTimeout(() => {
            if (res.caseDbId) navigate(`/cases/${res.caseDbId}`);
          }, 1500);
        }
      }
    } catch (err) {
      setError("Chat was interrupted.");
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="max-w-4xl mx-auto pt-16 pb-20 px-4">
      <div className="h-[800px] max-h-[85vh] bg-gray-900 border border-gray-800 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col relative animate-slide-up">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 blur-[100px] rounded-bl-full pointer-events-none"></div>
        
        {/* AI Assistant Header */}
        <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center z-10">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-gray-800 border border-brand-500/20 flex items-center justify-center text-3xl shadow-lg">👨‍⚕️</div>
              <div>
                 <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Oelod Virtual Resident</h1>
                 <p className="text-[10px] text-brand-500 font-bold uppercase tracking-[0.3em] mt-2">Personal Health Check-in</p>
              </div>
           </div>
           <button 
             onClick={() => navigate('/dashboard')}
             className="text-[10px] font-black text-gray-500 uppercase hover:text-white transition-all tracking-widest"
           >
             Exit Session
           </button>
        </div>

        {/* AI Assistant Chat Session */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar scroll-smooth">
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-sm sm:text-md leading-relaxed font-medium shadow-xl ${
                  m.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-none' 
                    : 'bg-gray-850/80 backdrop-blur-md text-gray-200 border border-white/5 rounded-bl-none italic'
                }`}>
                   {m.text}
                   {m.isFinal && m.caseDbId && (
                     <button 
                       onClick={() => navigate(`/cases/${m.caseDbId}`)}
                       className="mt-6 w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg animate-in zoom-in-95 duration-500"
                     >
                        Proceed to Case File →
                     </button>
                   )}
                </div>
             </div>
           ))}
           {isTyping && (
             <div className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-widest animate-pulse ml-4">
               <span className="w-2 h-2 rounded-full bg-brand-500"></span>
               Resident is thinking...
             </div>
           )}
           {error && (
             <div className="mx-auto p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-red-400 text-[10px] font-bold uppercase text-center w-fit shadow-2xl animate-bounce">
               🚨 {error}
               <button onClick={initSession} className="ml-4 underline hover:text-white">Reconnect</button>
             </div>
           )}
           <div ref={scrollRef} />
        </div>

        {/* Input Control Center */}
        <div className="p-4 sm:p-8 bg-black/40 border-t border-white/5">
           <form onSubmit={handleSend} className="flex gap-4 relative group">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your symptoms or health concerns here..."
                disabled={isTyping || !isInitialized}
                className="flex-1 bg-gray-950 border-2 border-gray-800 rounded-3xl px-6 sm:px-8 py-4 sm:py-6 text-white text-md sm:text-lg placeholder:text-gray-600 focus:border-brand-500 outline-none transition-all pr-24 sm:pr-36 shadow-inner"
              />
              <button 
                type="submit"
                disabled={isTyping || !input.trim() || !isInitialized}
                className="absolute right-2 top-2 bottom-2 px-4 sm:px-6 bg-brand-600 hover:bg-brand-500 text-white rounded-[1.2rem] flex items-center gap-2 font-black transition-all disabled:opacity-30 active:scale-95"
              >
                <span className="hidden sm:inline text-[10px] uppercase tracking-widest">Send</span> 
                <span className="text-xl">→</span>
              </button>
           </form>
           <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-tighter mt-4 sm:mt-6">
              Highest-level medical data security enabled.
           </p>
        </div>

        {/* Finalization Overlay */}
         {messages.some(m => m.isFinal) && (
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
              <div className="w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Summary Sealed</h2>
              <p className="text-brand-500 font-bold text-xs uppercase tracking-widest animate-pulse mb-8">Redirecting to your specialist queue...</p>
              
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-gray-900 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all"
              >
                Go to Dashboard instead
              </button>
           </div>
         )}
      </div>
    </div>
  );
}
