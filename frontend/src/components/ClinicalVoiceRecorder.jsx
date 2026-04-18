import { useState, useRef } from 'react';
import api from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

/**
 * Clinical Voice Recorder Manifold
 * Character-perfectly captures medical findings for AI-powered transcription.
 */
export default function ClinicalVoiceRecorder({ caseId, onProcessed }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timer, setTimer] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      toast.success('Clinical Audio Intake Initiated');
    } catch (err) {
      toast.error('Identity Mismatch: Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const uploadVoiceNote = async (blob) => {
    setProcessing(true);
    const formData = new FormData();
    formData.append('audio', blob, 'clinical_note.webm');

    try {
      const { data } = await api.post(`/cases/${caseId}/voice-notes`, formData);
      toast.success('Institutional Transcript Sealed.');
      if (onProcessed) onProcessed(data.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Transcription Handshake Failed';
      toast.error(`Institutional Error: ${msg}`);
      console.error('[Telemed] Transcription Failure:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-ping' : 'bg-gray-700'}`}></span>
          Clinical Voice Manifold
        </h2>
        {recording && (
           <span className="font-mono text-brand-400 text-sm font-bold">{formatTime(timer)}</span>
        )}
      </div>

      {!recording ? (
        <button 
          onClick={startRecording}
          disabled={processing}
          className="w-full flex items-center justify-center gap-4 py-8 bg-gray-900 border border-gray-800 rounded-xl hover:border-brand-500/40 hover:bg-brand-900/10 group transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🎤</div>
          <div className="text-left">
             <p className="text-white font-black text-sm uppercase tracking-tighter italic">Initialize Dictation</p>
             <p className="text-gray-500 text-[10px] uppercase font-medium">Secondary Diagnostic Handshake</p>
          </div>
        </button>
      ) : (
        <button 
          onClick={stopRecording}
          className="w-full flex items-center justify-center gap-4 py-8 bg-red-900/10 border border-red-500/30 rounded-xl hover:bg-red-900/20 group transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-xl animate-pulse">🛑</div>
          <div className="text-left">
             <p className="text-red-400 font-black text-sm uppercase tracking-tighter italic">Conclude Intake</p>
             <p className="text-red-500/60 text-[10px] uppercase font-medium">Seal Forensic Record</p>
          </div>
        </button>
      )}

      {processing && (
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-10 transition-all">
           <div className="flex flex-col items-center gap-4">
              <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
              <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] animate-pulse">Running AI Inference…</p>
           </div>
        </div>
      )}
    </div>
  );
}
