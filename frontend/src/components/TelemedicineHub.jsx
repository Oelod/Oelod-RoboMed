import { useState, useRef, useEffect } from 'react';
import { useTelemedicine } from '../context/TelemedicineContext';

/**
 * Pure Telemedicine Hub (Global Monitor)
 * Rendered once in App.jsx. Handles all consultation prompts and video streams globally.
 * Strictly decoupled from initialization triggers to prevent UI duplication.
 */
export default function TelemedicineHub() {
  const { 
    callActive, incomingCall, localStream, remoteStream, isConnecting, activeCaseId,
    handleAcceptCall, terminateCall 
  } = useTelemedicine();

  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
       localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callActive]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!incomingCall && !callActive) return null;

  const showPrompt = incomingCall && !callActive;

  return (
    <div className={`fixed transition-all duration-700 z-[5000] border-2 border-brand-500/30 bg-black/90 backdrop-blur-3xl shadow-2xl shadow-brand-500/10 overflow-hidden
      ${isMinimized 
        ? 'top-8 right-8 w-20 h-20 rounded-full cursor-pointer hover:scale-110' 
        : 'top-8 right-8 w-80 sm:w-96 rounded-[3rem]'}`}>
      
      {isMinimized ? (
        <div onClick={() => setIsMinimized(false)} className="w-full h-full flex items-center justify-center text-2xl animate-pulse cursor-pointer">
          📷
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${callActive && remoteStream ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {showPrompt ? 'Inbound Consultation' : callActive && remoteStream ? 'Live Consultation' : 'Identity Handshake'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">−</button>
              <button onClick={() => terminateCall(true)} className="p-2 hover:bg-red-500/20 rounded-full text-red-500 transition-colors">✕</button>
            </div>
          </div>

          <div className="p-6">
            {showPrompt ? (
              /* Prompt View */
              <div className="text-center py-4">
                 <div className="w-16 h-16 rounded-3xl bg-brand-500/10 flex items-center justify-center text-2xl mx-auto mb-6 border border-brand-500/20 animate-bounce">📷</div>
                 <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1 italic">Statutory Inbound Connection</p>
                 <p className="text-lg font-black text-white uppercase italic tracking-tighter mb-8">
                   {incomingCall.callerName.toLowerCase().startsWith('dr') ? '' : 'DR. '}{incomingCall.callerName}
                 </p>
                 <div className="flex gap-3">
                    <button onClick={handleAcceptCall} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-4 rounded-2xl transition-all shadow-lg shadow-green-900/20">Accept</button>
                    <button onClick={() => terminateCall(true)} className="flex-1 bg-red-950/30 border border-red-500/50 text-red-500 text-[10px] font-black uppercase py-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all">Reject</button>
                 </div>
              </div>
            ) : (
              /* Active Call View */
              <div className="space-y-4">
                 <div className="aspect-video bg-gray-900 rounded-[2rem] overflow-hidden relative border border-white/10 shadow-inner">
                    {remoteStream ? (
                      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                         <div className="relative">
                            <div className="animate-ping absolute inset-0 rounded-full bg-brand-500/10"></div>
                            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-2xl">👤</div>
                         </div>
                         <p className="text-[8px] font-black text-brand-500 uppercase tracking-[0.2em] animate-pulse text-center">
                            {isConnecting ? 'Handshaking Protocol...' : 'Awaiting Data Stream...'}
                         </p>
                      </div>
                    )}

                    {/* Local PIP */}
                    <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-60" />
                    </div>
                 </div>

                 <div className="px-4 py-2 text-center">
                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-[0.4em]">
                      End-to-End Encrypted Clinical Tunnel · v7.0 · {activeCaseId?.slice(-8).toUpperCase()}
                    </p>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
