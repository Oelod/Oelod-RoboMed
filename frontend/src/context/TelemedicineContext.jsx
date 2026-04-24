import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuthContext } from './AuthContext';
import { useSocketContext } from './SocketContext';
import { toast } from 'react-hot-toast';

const TelemedicineContext = createContext(null);

export function TelemedicineProvider({ children }) {
  const { user } = useAuthContext();
  const { socket, connected } = useSocketContext();
  
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);

  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);
  const ringToneRef = useRef(null);

  const stopRingTone = () => {
    if (ringToneRef.current) {
      ringToneRef.current.pause();
      ringToneRef.current.currentTime = 0;
    }
  };

  const playRingTone = () => {
    if (!ringToneRef.current) {
       ringToneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
       ringToneRef.current.loop = true;
    }
    ringToneRef.current.play().catch(() => {});
  };

  const initPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        socket.emit('call_signal', { targetUserId, signalData: { candidate: event.candidate } });
      }
    };
  };

  const startCall = async (caseId, targetId) => {
    setIsConnecting(true);
    setCallActive(true);
    setActiveCaseId(caseId);
    setTargetUserId(targetId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;

      initPeerConnection();
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit('call_initiate', { caseId, targetUserId: targetId, signalData: offer });
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      setCallActive(false);
      toast.error('Clinical Device Error: Please ensure camera/mic permissions are granted.');
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    stopRingTone();
    setIsConnecting(true);
    setCallActive(true);
    setActiveCaseId(incomingCall.caseId);
    setTargetUserId(incomingCall.callerId);
    
    try {
      // Hardware Handshake: Attempt full A/V, fallback to Audio if device is locked
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        console.warn("Hardware Collision Detected: Falling back to Institutional Audio Channel.");
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        toast('Camera Locked: Initiating Secure Audio Consultation', { icon: '🎙️' });
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      initPeerConnection();
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('call_signal', { targetUserId: incomingCall.callerId, signalData: answer });
      setIncomingCall(null);
      setIsConnecting(false);
    } catch (err) {
      console.error("Clinical Handshake Failure:", err);
      setIsConnecting(false);
      setCallActive(false);
      toast.error(`Handshake Failure: ${err.message}`);
      terminateCall();
    }
  };

  const terminateCall = (shouldEmit = true) => {
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
    
    if (shouldEmit && socket && connected && targetUserId) {
      socket.emit('call_terminate', { targetUserId, caseId: activeCaseId, wasAccepted });
    }

    setCallActive(false);
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsConnecting(false);
    setActiveCaseId(null);
    setTargetUserId(null);
  };

  useEffect(() => {
    if (!socket || !connected) return;

    const onIncomingCall = (data) => {
      // Don't interrupt active calls
      if (callActive) return;
      console.log("[Clinical Handshake] Inbound Signal Detected:", data.callerName);
      setIncomingCall(data);
      playRingTone();
    };

    // Force-join the institutional signaling room for current identity
    socket.emit('join_case', null); 

    const onSignalReceived = async (data) => {
      if (!peerConnection.current) return;
      if (data.signalData.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.signalData.candidate));
      } else {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.signalData));
      }
    };

    const onDisconnected = () => {
      terminateCall(false);
      toast('Consultation Terminated by Remote Participant');
    };

    socket.on('call_incoming', onIncomingCall);
    socket.on('call_signal_received', onSignalReceived);
    socket.on('call_disconnected', onDisconnected);

    return () => {
      socket.off('call_incoming', onIncomingCall);
      socket.off('call_signal_received', onSignalReceived);
      socket.off('call_disconnected', onDisconnected);
    };
  }, [socket, connected, callActive, targetUserId]);

  return (
    <TelemedicineContext.Provider value={{ 
      callActive, incomingCall, localStream, remoteStream, isConnecting, activeCaseId,
      startCall, handleAcceptCall, terminateCall, setIncomingCall, stopRingTone
    }}>
      {children}
    </TelemedicineContext.Provider>
  );
}

export const useTelemedicine = () => useContext(TelemedicineContext);
