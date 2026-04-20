import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocketContext } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Institutional Global Signal Receiver
 * Character-perfectly handles incoming consultation signals across the entire registry.
 */
export default function GlobalSignalReceiver() {
  const { user } = useAuth();
  const { socket, connected } = useSocketContext();
  const navigate = useNavigate();
  const ringToneRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const playRingTone = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      ringToneRef.current = { ctx: audioCtx, osc: oscillator };
      const interval = setInterval(() => {
        if (!ringToneRef.current) return clearInterval(interval);
        const now = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
      }, 2000);
      ringToneRef.current.interval = interval;
    } catch (e) { console.warn('Signal Handshake Failed'); }
  };

  const stopRingTone = () => {
    if (ringToneRef.current) {
      clearInterval(ringToneRef.current.interval);
      try {
        ringToneRef.current.osc.stop();
        ringToneRef.current.ctx.close();
      } catch (e) {}
      ringToneRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket || !connected) return;

    const handleIncoming = (data) => {
       setIncomingCall(data);
       playRingTone();
       toast.success(`Statutory Consult: ${data.callerName}`, { 
         duration: 15000,
         style: { border: '1px solid #c9a747', background: '#000', color: '#fff' }
       });
    };

    const handleDisconnect = () => {
       setIncomingCall(null);
       stopRingTone();
    };

    socket.on('call_incoming', handleIncoming);
    socket.on('call_disconnected', handleDisconnect);

    return () => {
      socket.off('call_incoming', handleIncoming);
      socket.off('call_disconnected', handleDisconnect);
      stopRingTone();
    };
  }, [socket, connected]);

  if (!incomingCall) return null;

  return (
    <div className="fixed top-20 right-10 z-[3000] w-80 bg-black border-2 border-brand-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(var(--brand-500-rgb),0.3)] animate-bounce-slow">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center text-3xl animate-pulse">📷</div>
        <div className="text-center">
          <p className="text-[8px] font-black text-brand-500 uppercase tracking-[0.3em]">Statutory Inbound Call</p>
          <h4 className="text-white font-black text-xs uppercase mt-1">Dr. {incomingCall.callerName}</h4>
        </div>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={() => {
              stopRingTone();
              setIncomingCall(null);
              navigate(`/cases/${incomingCall.caseId}`);
            }}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all"
          >
            Accept
          </button>
          <button 
            onClick={() => {
              stopRingTone();
              socketRef.current.emit('call_terminate', { targetUserId: incomingCall.callerId, wasAccepted: false });
              setIncomingCall(null);
            }}
            className="flex-1 bg-red-600/20 hover:bg-red-600 text-white text-[10px] font-black uppercase py-3 rounded-xl border border-red-600/50 transition-all"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
