import { useTelemedicine } from '../context/TelemedicineContext';

/**
 * TelemedicineTrigger
 * A lightweight component that only displays the "Initialize Video" button.
 * Used within specific clinical contexts (like CaseDetailPage).
 */
export default function TelemedicineTrigger({ caseId, targetUserId, isDoctor }) {
  const { startCall, callActive, incomingCall } = useTelemedicine();

  if (!isDoctor || callActive || incomingCall) return null;

  return (
    <button 
      onClick={() => startCall(caseId, targetUserId)}
      className="btn-primary w-full !py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-500/20"
    >
      📷 Initialize Video Consultation
    </button>
  );
}
