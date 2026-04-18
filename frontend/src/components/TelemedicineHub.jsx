import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

/**
 * Institutional Telemedicine Hub
 * Character-perfectly handles WebRTC Peer-to-Peer clinical consultations.
 */
export default function TelemedicineHub({ caseId, targetUserId, isDoctor }) {
  const { user } = useAuth();
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const peerConnection = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringToneRef = useRef(null);

  const ICE_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  const playRingTone = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      
      // Clinical pulse effect
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      
      ringToneRef.current = { ctx: audioCtx, osc: oscillator };
      // Loop the ring every 2 seconds
      const interval = setInterval(() => {
        if (!ringToneRef.current) return clearInterval(interval);
        const now = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);
      }, 2000);
      ringToneRef.current.interval = interval;
    } catch (e) { console.warn('Audio handshake failed'); }
  };

  const stopRingTone = () => {
    if (ringToneRef.current) {
      clearInterval(ringToneRef.current.interval);
      ringToneRef.current.osc.stop();
      ringToneRef.current.ctx.close();
      ringToneRef.current = null;
    }
  };

  useEffect(() => {
    // Connect to institutional signal registry
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
       auth: { token: localStorage.getItem('token') }
    });

    socketRef.current.on('call_incoming', (data) => {
       if (data.caseId === caseId) {
          setIncomingCall(data);
          playRingTone();
          toast.success(`Statutory Incoming Consultation: ${data.callerName}`, { duration: 15000 });
       }
    });

    socketRef.current.on('call_signal_received', async ({ signalData }) => {
       if (signalData.type === 'offer') {
          await handleOffer(signalData);
       } else if (signalData.type === 'answer') {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
       } else if (signalData.candidate) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(signalData));
       }
    });

    socketRef.current.on('call_disconnected', () => {
       terminateCall();
    });

    return () => {
      socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      stopRingTone();
    };
  }, [caseId]);

  const initPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
    
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('call_signal', { targetUserId, signalData: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      initPeerConnection();
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socketRef.current.emit('call_initiate', { caseId, targetUserId });
      socketRef.current.emit('call_signal', { targetUserId, signalData: offer });
      setCallActive(true);
    } catch (err) {
      toast.error('Clinical Device Error: Camera/Mic blocked.');
    }
  };

  const handleOffer = async (offer) => {
    stopRingTone();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      initPeerConnection();
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socketRef.current.emit('call_signal', { targetUserId, signalData: answer });
      setCallActive(true);
      setIncomingCall(null);
    } catch (err) {
      toast.error('Handshake Failure: Clinical stream bypassed.');
      terminateCall();
    }
  };

  const terminateCall = () => {
    stopRingTone();
    const wasAccepted = !!remoteStream;

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    
    // Notify registry of termination status
    socketRef.current.emit('call_terminate', { targetUserId, caseId, wasAccepted });

    setCallActive(false);
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
    toast('Clinical Consultation Concluded');
  };

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

  if (!callActive && !incomingCall) {
    if (isDoctor) {
      return (
        <button 
          onClick={startCall}
          className="btn-primary w-full !py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20"
        >
          📷 Initialize Video Consultation
        </button>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-3xl p-6 flex items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="relative w-full max-w-6xl aspect-video bg-gray-900 border border-brand-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(var(--brand-500-rgb),0.2)]">
        
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0 bg-gray-950">
           {remoteStream ? (
             <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                <div className="animate-pulse w-32 h-32 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-5xl">👤</div>
                <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.4em] animate-pulse">Establishing Secure Clinical Handshake…</p>
             </div>
           )}
        </div>

        {/* Local Video (PIP) */}
        <div className="absolute bottom-10 right-10 w-48 sm:w-72 aspect-video bg-gray-950 border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden z-20">
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
           <div className="absolute top-4 left-4 flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
           </div>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30 px-10 py-5 bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-full">
           {incomingCall ? (
              <button 
                onClick={() => handleOffer(incomingCall)}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center text-2xl shadow-xl shadow-green-900/40 hover:scale-110 transition-all animate-bounce"
              >
                📞
              </button>
           ) : null}
           
           <button 
             onClick={terminateCall}
             className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-2xl shadow-xl shadow-red-900/40 hover:scale-110 transition-all"
           >
             ✖
           </button>

           <div className="h-8 w-px bg-gray-800 mx-2"></div>
           
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">Consultation Active</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Case Reference: {caseId.slice(-8).toUpperCase()}</span>
           </div>
        </div>

        {/* Institutional Branding */}
        <div className="absolute top-10 left-10 p-4 border-l-2 border-brand-500">
           <h3 className="text-white font-black text-xs uppercase tracking-widest italic">Oelod RoboMed</h3>
           <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Institutional Telemedicine Manifold · v2.1</p>
        </div>
      </div>
    </div>
  );
}
