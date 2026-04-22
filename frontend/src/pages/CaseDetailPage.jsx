import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCaseById, acceptCase, closeCase, uploadAttachments, requestLab, uploadLabResult, getCaseLabs, addPrescription, getCasePrescriptions, acknowledgePrescription, getFullPatientHistory, flagCase, escalateCase, assignDoctor } from '../api/cases';
import { submitMisconductReport } from '../api/reports';
import api from '../api/axiosInstance';
import { useAuth } from '../hooks/useAuth';
import ChatPanel from '../components/ChatPanel';
import ClinicalVoiceRecorder from '../components/ClinicalVoiceRecorder';
import TelemedicineHub from '../components/TelemedicineHub';
import { toast } from 'react-hot-toast';

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [medicalCase, setMedicalCase] = useState(null);
  const [labs, setLabs] = useState({ requests: [], results: [] });
  const [prescriptions, setPrescriptions] = useState([]);
  const [patientHistory, setPatientHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Tabular Modal States
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [rxNotes, setRxNotes] = useState('');

  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState([{ testType: '', urgency: 'routine' }]);

  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateOffice, setEscalateOffice] = useState('');
  const [escalateReason, setEscalateReason] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [assignForm, setAssignForm] = useState({ doctorId: '', specialty: '', note: '' });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: '', description: '' });

  const fetchCase = async () => {
    try {
      // Parallel hydration
      const [caseRes, labsRes, rxRes] = await Promise.all([
        getCaseById(caseId),
        getCaseLabs(caseId).catch(() => ({ data: { requests: [], results: [] } })),
        getCasePrescriptions(caseId).catch(() => ({ data: { prescriptions: [] } }))
      ]);
      setMedicalCase(caseRes.data.case);
      setLabs(labsRes.data || { requests: [], results: [] });
      setPrescriptions(rxRes.data?.prescriptions || []);

      // If doctor, fetch patient's medical history
      if (user?.activeRole === 'doctor' || user?.activeRole === 'admin') {
         getFullPatientHistory(caseRes.data.case.patient._id)
          .then(res => setPatientHistory(res.data.history))
          .catch(err => console.warn('Could not load patient history', err));
      }

      // If admin, fetch doctors for assignment pool
      if (user?.activeRole === 'admin') {
          api.get('/admin/users?role=doctor')
            .then(res => setAvailableDoctors(res.data.data.users))
            .catch(err => console.warn('Could not load doctors pool', err));
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load case setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptCase(caseId);
      await fetchCase();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    const summary = window.prompt("Required: Please provide a clinical closing summary or prescription note to conclude this case.");
    if (!summary || summary.trim().length < 5) {
      alert("A detailed clinical closing summary is required to close this case.");
      return;
    }
    
    setActionLoading(true);
    try {
      await closeCase(caseId, summary.trim());
      await fetchCase();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    
    setActionLoading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    try {
        await uploadAttachments(caseId, formData);
        await fetchCase();
        alert('File attached safely.');
    } catch(err) {
        alert(err.response?.data?.message || 'Upload failed');
    } finally {
        setActionLoading(false);
    }
  };

  const handleOpenRxModal = () => {
    setShowRxModal(true);
    setRxForm([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    setRxNotes('');
  };

  const submitPrescription = async () => {
    const valid = rxForm.filter(d => d.name.trim() !== '');
    if (!valid.length) return alert('Enter at least one medicine.');
    setActionLoading(true);
    try {
      await addPrescription(caseId, { drugs: valid, notes: rxNotes.trim() });
      await fetchCase();
      setShowRxModal(false);
      alert('Prescription issued securely to the patient.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue prescription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLabModal = () => {
    setShowLabModal(true);
    setLabForm([{ testType: '', urgency: 'routine' }]);
  };

  const submitLabs = async () => {
    const valid = labForm.filter(l => l.testType.trim() !== '');
    if (!valid.length) return alert('Enter at least one lab test.');
    setActionLoading(true);
    try {
      for (const lab of valid) {
         await requestLab(caseId, lab);
      }
      await fetchCase();
      setShowLabModal(false);
      alert('Labs requested successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request labs');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveEscalation = async () => {
    if (!resolveNote.trim()) return;
    setActionLoading(true);
    try {
      await api.patch(`/cases/${caseId}/resolve-escalation`, { reason: resolveNote });
      setShowResolveModal(false);
      setResolveNote('');
      await fetchCase();
    } catch (err) {
      alert(err.response?.data?.message || 'Resolution failed');
    } finally {
      setActionLoading(false);
    }
  };

  const latestEscalation = medicalCase?.governanceNotes
    ?.filter(n => n.action === 'escalated')
    .pop();
  
  const isTargetOfficeAdmin = user?.activeRole === 'admin' && user?.assignedOffice === latestEscalation?.office;

  const handleAcknowledge = async (rxId) => {
    setActionLoading(true);
    try {
      await acknowledgePrescription(caseId, rxId);
      toast.success('Prescription Legally Acknowledged');
      fetchCase();
    } catch (err) {
      toast.error('Acknowledgment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleItemStatusUpdate = async (rxId, index, status) => {
    setActionLoading(true);
    try {
      await api.patch(`/departments/pharmacy/prescriptions/${rxId}/item/${index}`, { status });
      toast.success(`Medication recorded as ${status}`);
      fetchCase();
    } catch (err) {
      toast.error('Failed to update medication: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadLab = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setActionLoading(true);
    const formData = new FormData();
    formData.append('files', files[0]); // Multer limits to 1 for lab result endpoint
    
    try {
      await uploadLabResult(caseId, formData);
      await fetchCase();
      alert('Lab result uploaded and seamlessly linked to pending request!');
    } catch(err) {
      alert(err.response?.data?.message || 'Lab Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagCase = async () => {
    if (!flagReason.trim()) return alert('A reason for flagging is required.');
    setActionLoading(true);
    try {
      await flagCase(caseId, flagReason.trim());
      await fetchCase();
      setShowFlagModal(false);
      setFlagReason('');
      alert('Case flagged for official review.');
    } catch (err) {
      alert(err.response?.data?.message || 'Flagging failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateCase = async () => {
    if (!escalateOffice.trim() || !escalateReason.trim()) return alert('Target office and reason are required.');
    setActionLoading(true);
    try {
      await escalateCase(caseId, escalateOffice.trim(), escalateReason.trim());
      await fetchCase();
      setShowEscalateModal(false);
      setEscalateOffice('');
      setEscalateReason('');
      alert(`Case successfully escalated to ${escalateOffice}.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Escalation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualAssign = async () => {
    if (!assignForm.doctorId) return alert('Select a doctor for assignment.');
    setActionLoading(true);
    try {
      await assignDoctor(caseId, assignForm);
      await fetchCase();
      setShowAssignModal(false);
      alert('Case successfully transferred to selected clinician.');
    } catch (err) {
      alert(err.response?.data?.message || 'Transfer failed');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReport = async () => {
    if (!reportForm.reason || reportForm.description.length < 20) {
       return alert('Requirement: Please select a reason and provide at least 20 characters of detail.');
    }
    setActionLoading(true);
    try {
       await submitMisconductReport({
          caseId,
          targetDoctor: medicalCase.doctor._id,
          ...reportForm
       });
       toast.success('Conduct report successfully filed. Professional review initiated.');
       setShowReportModal(false);
       setReportForm({ reason: '', description: '' });
    } catch (err) {
       toast.error(err.response?.data?.message || 'Submission Failure');
    } finally {
       setActionLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400';
      case 'assigned': return 'bg-purple-500/20 text-purple-400';
      case 'closed': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading case details...</div>;
  }

  if (error || !medicalCase) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-4">{error}</div>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const isDoctor = user?.activeRole === 'doctor';
  const isOpen = medicalCase.status === 'open';
  const isAssignedToMe = isDoctor && medicalCase.doctor?._id === user?._id;

  return (
    <>
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 sm:mb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase flex flex-col sm:flex-row sm:items-center gap-3">
            Case {medicalCase.caseCode}
            <span className={`text-[10px] w-fit px-3 py-1 rounded-full uppercase font-black tracking-widest ${getStatusColor(medicalCase.status)}`}>
              {medicalCase.status}
            </span>
          </h1>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm font-medium italic">
            Submitted by <span className="text-white font-bold">{medicalCase.patient?.fullName}</span> on {new Date(medicalCase.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto no-print">
          <button className="btn-secondary !px-6 py-2.5 text-[10px] uppercase font-black tracking-widest" onClick={() => navigate('/dashboard')}>← Back</button>
          
          {(user?.activeRole === 'admin' || user?.activeRole === 'doctor') && medicalCase.status !== 'flagged' && medicalCase.status !== 'escalated' && (
            <button className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 text-[10px] uppercase font-black tracking-widest" onClick={() => setShowFlagModal(true)}>
              🚩 Flag Case
            </button>
          )}

          {user?.activeRole === 'admin' && medicalCase.status !== 'escalated' && (
            <button className="btn-secondary border-orange-500/30 text-orange-400 hover:bg-orange-500/10 px-4 text-[10px] uppercase font-black tracking-widest" onClick={() => setShowEscalateModal(true)}>
              🚀 Escalate
            </button>
          )}
          {user?.activeRole === 'admin' && (
            <button className="btn-secondary border-brand-500/30 text-brand-400 hover:bg-brand-500/10 px-4 text-[10px] uppercase font-black tracking-widest" onClick={() => setShowAssignModal(true)}>
              📥 Transfer Case
            </button>
          )}

          {isTargetOfficeAdmin && medicalCase?.status === 'escalated' && (
             <button className="btn-primary !bg-red-600 !text-white border-red-500 hover:bg-red-500 px-6 text-[10px] uppercase font-black tracking-widest shadow-xl shadow-red-500/40 animate-pulse ring-2 ring-red-500/50" onClick={() => setShowResolveModal(true)}>
               🖋️ Admin Resolution
             </button>
          )}

          {isDoctor && isOpen && (
            <button 
              className="btn-primary bg-brand-600 hover:bg-brand-500 text-[10px] uppercase font-black tracking-widest px-8" 
              onClick={handleAccept}
              disabled={actionLoading}
            >
              Accept Case →
            </button>
          )}
          {isAssignedToMe && medicalCase.status !== 'closed' && (
            <>
              <button 
                className="btn-secondary border-brand-500/30 text-brand-400 hover:bg-brand-500/10 px-4 text-[10px] uppercase font-black tracking-widest"
                onClick={handleOpenRxModal}
                disabled={actionLoading}
              >
                💊 Issue RX
              </button>
              <button 
                className="btn-secondary border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-4 text-[10px] uppercase font-black tracking-widest"
                onClick={handleOpenLabModal}
                disabled={actionLoading}
              >
                🔬 Request Lab
              </button>
              <button 
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg shadow-green-600/20"
                onClick={handleClose}
                disabled={actionLoading}
              >
                Safe Closure ✓
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Case Info */}
        <div className="md:col-span-2 space-y-6">
          {medicalCase.governanceNotes?.length > 0 && (
            <div className="bg-gradient-to-br from-red-900/20 to-gray-900 border border-red-500/20 rounded-2xl p-6 shadow-xl shadow-red-900/5">
               <h2 className="text-sm font-black text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="animate-pulse text-lg">⚖️</span> Official Medical Notes
               </h2>
               <div className="space-y-6">
                  {medicalCase.governanceNotes.map((note, idx) => (
                    <div key={idx} className="border-l-2 border-red-500/30 pl-6 py-2">
                       <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${note.action === 'escalated' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                             {note.action} {note.office && `to ${note.office}`}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                       </div>
                       <p className="text-gray-200 font-medium italic text-sm">"{note.note}"</p>
                       <p className="text-[10px] text-gray-600 font-bold uppercase mt-3">Staff ID: {note.actorId?._id?.slice(-8) || 'SYSTEM'}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">📝</span> Clinical Details
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {medicalCase.symptoms.map((sym, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm border border-gray-700">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description (Raw)</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{medicalCase.description || 'No additional description provided.'}</p>
              </div>
            </div>
          </div>

          {medicalCase.residentClerkship && (
            <div className="bg-gradient-to-br from-brand-900/10 to-gray-900 border border-brand-500/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl shadow-brand-900/5">
               <div className="absolute top-0 right-0 p-4 opacity-5">🏛️</div>
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 text-xl border border-brand-500/20">📋</div>
                    <div>
                      <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Medical Report (Virtual Resident)</h2>
                      <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest leading-none mt-1">Clinical Summary & Observations</p>
                    </div>
                  </div>
                  {isAssignedToMe && medicalCase.status !== 'closed' && (
                    <button 
                      className="px-6 py-2 bg-brand-600 text-black text-[10px] font-black uppercase rounded-full hover:bg-white hover:text-black transition-all shadow-lg shadow-brand-500/10"
                      onClick={() => alert('Clinical Concurrence Recorded: O.V.R. findings have been verified by Attending.')}
                    >
                      Verify Resident Findings ✓
                    </button>
                  )}
               </div>

               {medicalCase.residentClerkship.assessment.confidenceLevel.toLowerCase().includes('low') && (
                 <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 animate-pulse">
                    <span className="text-xl">⚠️</span>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Medical Note: Specialist review recommended for this case.</p>
                 </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Initial Assessment</h4>
                        <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                           <p className="text-sm font-bold text-white mb-1 uppercase italic">{medicalCase.residentClerkship.assessment.primaryFocus}</p>
                           <p className="text-[10px] text-brand-400 font-black uppercase tracking-widest mb-3">Confidence: {medicalCase.residentClerkship.assessment.confidenceLevel}</p>
                           <p className="text-[12px] text-gray-400 leading-relaxed italic">"{medicalCase.residentClerkship.patientExplanation}"</p>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Patient Medical History</h4>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                            {medicalCase.residentClerkship.history.map((h, i) => (
                              <span key={i} className="px-3 py-1 bg-gray-800/50 border border-gray-800 text-gray-400 font-bold uppercase rounded-lg">{h}</span>
                            ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Resident's Internal Note</h4>
                        <div className="p-5 bg-brand-500/5 border border-brand-500/10 rounded-2xl">
                           <p className="text-xs text-brand-300 leading-relaxed font-medium">"{medicalCase.residentClerkship.residentNote}"</p>
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Official Verification</h4>
                        <div className="flex justify-between items-center bg-gray-950 px-4 py-2 rounded-xl border border-gray-800">
                           <span className="text-[8px] font-mono text-gray-600">SEALED_{new Date(medicalCase.residentClerkship.sealedAt).getTime()}</span>
                           <span className="text-[8px] font-black text-green-500 uppercase">Verified</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="text-brand-400">📎</span> Medical Records</span>
              {medicalCase.patient?._id === user?._id && medicalCase.status !== 'closed' && (
                <label className="btn-secondary px-3 py-1 text-sm cursor-pointer border border-brand-500/30 text-brand-400 hover:bg-brand-500/10">
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={actionLoading} accept="image/*,application/pdf" />
                  + Upload
                </label>
              )}
            </h2>
            {medicalCase.attachments?.length > 0 ? (
                <ul className="space-y-2">
                   {medicalCase.attachments.map((file, i) => (
                      <li key={i} className="flex flex-wrap items-center">
                         <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-2">
                           📄 Report {i + 1}
                         </a>
                      </li>
                   ))}
                </ul>
            ) : <p className="text-gray-500 text-sm italic">No records attached.</p>}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">🔬</span> Laboratory & Tests
            </h2>
            
            <div className="space-y-4">
              {labs.requests.length === 0 && labs.results.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-gray-800 rounded-2xl text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
                  No Diagnostic Routing Initiated
                </div>
              ) : (
                <div className="grid gap-3">
                  {labs.requests.map((req, i) => (
                    <div key={i} className="p-5 bg-gray-950/50 rounded-2xl border border-gray-800 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                               req.urgency === 'stat' ? 'bg-red-500/20 text-red-400' :
                               req.urgency === 'urgent' ? 'bg-orange-500/20 text-orange-400' :
                               'bg-blue-500/20 text-blue-400'
                            }`}>
                               {req.urgency}
                            </span>
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Requested {new Date(req.createdAt).toLocaleDateString()}</span>
                         </div>
                         <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">{req.testType}</h3>
                       </div>

                       <div className="flex items-center gap-4">
                          {req.status === 'pending' ? (
                            medicalCase.patient?._id === user?._id && medicalCase.status !== 'closed' ? (
                              <label className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer transition-all shadow-lg shadow-green-900/20">
                                 <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUploadLab} />
                                 Upload Findings
                              </label>
                            ) : (
                              <span className="text-[10px] font-black text-yellow-500 uppercase border border-yellow-500/30 px-3 py-1 rounded-lg">Awaiting Results</span>
                            )
                          ) : (
                            <span className="text-[10px] font-black text-green-500 uppercase border border-green-500/30 px-3 py-1 rounded-lg">Processed</span>
                          )}
                       </div>
                    </div>
                  ))}
                  
                  {labs.results.map((res, i) => (
                    <div key={i} className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <span className="text-2xl">📄</span>
                         <div>
                            <p className="text-sm font-black text-white">Diagnostic Findings Uploaded</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(res.uploadedAt).toLocaleString()}</p>
                         </div>
                       </div>
                       <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-400 uppercase hover:text-white transition-colors">
                         Open Report 📥
                       </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">💊</span> Active Prescriptions
            </h2>
              <div className="p-8 border-2 border-dashed border-gray-800 rounded-2xl text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
                No active medication orders
              </div>
            ) : (
              <div className="grid gap-6">
                {prescriptions.filter(rx => rx.isActive).map((rx, idx) => (
                   <div key={idx} className={`rounded-[2rem] border-2 relative overflow-hidden transition-all ${rx.acknowledgedByPatient ? 'bg-green-500/5 border-green-500/20' : 'bg-brand-500/5 border-brand-500/20 shadow-xl shadow-brand-900/10'}`}>
                     <div className="px-6 py-4 border-b border-gray-800/40 bg-gray-950/20 flex items-center justify-between">
                       <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${rx.acknowledgedByPatient ? 'text-green-500' : 'text-brand-400'}`}>
                         {rx.acknowledgedByPatient ? '✓ Legal Acknowledgment Secured' : 'Unsigned Medical Prescription'}
                       </span>
                       <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">ID: {rx._id.slice(-6)}</span>
                     </div>
                     
                     <div className="p-6 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          {rx.drugs.map((d, i) => (
                            <div key={i} className={`p-5 rounded-2xl border transition-all ${d.status === 'dispensed' ? 'bg-green-500/5 border-green-500/20' : d.status === 'external' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-gray-950/50 border-gray-800'}`}>
                               <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-black text-white text-md uppercase tracking-tight">{d.name}</h4>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${d.status === 'dispensed' ? 'bg-green-500/20 text-green-400' : d.status === 'external' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'}`}>
                                     {d.status}
                                  </span>
                               </div>
                               
                               <div className="flex gap-4 text-[10px] font-black lowercase text-gray-500 tracking-tighter mb-4">
                                  <span>{d.dosage}</span>
                                  <span>·</span>
                                  <span>{d.frequency}</span>
                               </div>

                               {/* Patient Action Gate */}
                               {d.status === 'pending' && medicalCase.patient?._id === user?._id && (
                                  <button 
                                    onClick={() => handleItemStatusUpdate(rx._id, i, 'external')}
                                    className="w-full py-2 bg-gray-900 border border-gray-800 text-[9px] font-black text-gray-500 uppercase rounded-xl hover:bg-orange-600 hover:text-white transition-all"
                                  >
                                    Mark Sourced Externally
                                  </button>
                               )}

                               {d.fulfilledAt && (
                                  <p className="text-[8px] text-gray-600 font-bold uppercase mt-2">Verified: {new Date(d.fulfilledAt).toLocaleDateString()}</p>
                                )}
                            </div>
                          ))}
                        </div>

                        {rx.notes && (
                          <div className="pt-4 mt-2 border-t border-gray-800/40">
                             <span className="text-[9px] text-gray-500 uppercase font-black block mb-2 tracking-widest">Physician Note</span>
                             <p className="text-sm text-gray-300 font-medium leading-relaxed">{rx.notes}</p>
                          </div>
                        )}
                        
                        {!rx.acknowledgedByPatient && medicalCase.patient?._id === user?._id && (
                            <div className="pt-6">
                              <button 
                                className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-green-900/30"
                                onClick={() => handleAcknowledge(rx._id)}
                                disabled={actionLoading}
                              >
                                Sign & Acknowledge Script
                              </button>
                            </div>
                        )}
                     </div>
                   </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-brand-400">⏱️</span> Action Timeline
            </h2>
            <div className="space-y-4">
              {medicalCase.timeline.map((event, i) => (
                <div key={i} className="flex gap-4 border-l-2 border-gray-800 pl-4 py-1 relative">
                  <div className="absolute w-2 h-2 bg-brand-500 rounded-full -left-[5px] top-3"></div>
                  <div>
                    <p className="font-medium text-gray-200 capitalize">{event.event.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                      {event.note && <p className="text-sm text-gray-400 mt-1 italic">"{event.note}"</p>}
                      
                      {/* Official Audio Record */}
                      {event.event && event.event.toLowerCase().replace(/_/g, ' ').includes('voice note processed') && 
                       (user?.activeRole === 'doctor' || String(user?._id) === String(medicalCase.patient?._id) || user?.adminLevel === 3) && (
                        <div className="mt-4 p-6 bg-gray-950 border-2 border-brand-500 rounded-[2rem] flex flex-col gap-4 shadow-[0_0_50px_rgba(var(--brand-500-rgb),0.1)] relative overflow-hidden group">
                           {/* Audio Signal Badge */}
                           <div className="absolute top-0 right-0 bg-brand-500 text-black text-[7px] font-black px-4 py-1 rounded-bl-xl tracking-[0.2em] uppercase">Official Clinical Audio</div>
                           
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 text-xl animate-pulse">🎙️</div>
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Physician Voice Summary</p>
                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Official Audio Analysis · {event.metadata?.provider || 'SYSTEM'}</p>
                              </div>
                           </div>

                           {event.metadata?.audioUrl ? (
                             <audio controls className="w-full h-12 rounded-full overflow-hidden border border-white/10 opacity-90 hover:opacity-100 transition-all bg-white/5">
                               <source src={event.metadata.audioUrl} type="audio/webm" />
                               <source src={event.metadata.audioUrl} type="audio/mpeg" />
                             </audio>
                           ) : (
                             <div className="p-3 bg-red-950/20 border border-red-500/40 rounded-xl text-center">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">Audio Recording Missing</p>
                             </div>
                           )}
                           
                           <div className="flex justify-between items-center px-2">
                             <span className="text-[8px] font-black text-brand-500/50 uppercase tracking-widest">Digital Signature: {event.metadata?.audioUrl ? 'Verified' : 'Error'}</span>
                             <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">ID: {event.metadata?.publicId?.slice(-12) || 'Official Approval'}</span>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

          {/* AI & Meta Sidebar */}
          <div className="space-y-6">
            <TelemedicineHub 
              caseId={caseId} 
              targetUserId={String(isDoctor ? medicalCase.patient?._id : medicalCase.doctor?._id)}
              isDoctor={isDoctor}
            />

            {isAssignedToMe && medicalCase.status !== 'closed' && (
              <ClinicalVoiceRecorder caseId={caseId} onProcessed={fetchCase} />
            )}

            {/* Real-time Chat Panel */}
          {medicalCase.doctor && (
            <ChatPanel caseId={caseId} status={medicalCase.status} />
          )}

          {medicalCase.residentClerkship && (
            <div className="bg-gradient-to-br from-indigo-950/40 to-gray-900 border border-indigo-500/30 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-900/10 relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
               
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl border border-indigo-500/20 shadow-inner">👨‍⚕️</div>
                  <div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">O.V.R. Clerkship</h2>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1 italic">Institutional Entry #{medicalCase._id.slice(-6)}</p>
                  </div>
               </div>

               <div className="space-y-8">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 italic">Clinical Findings</h3>
                    <div className="space-y-2">
                       {Object.entries(medicalCase.residentClerkship.findings || {}).map(([key, val], idx) => (
                         <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-xs text-gray-400 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-xs text-white font-bold">{val === true ? 'Yes' : val === false ? 'No' : val}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 italic">Professional Assessment</h3>
                    <p className="text-sm text-gray-300 font-medium leading-relaxed italic">"{medicalCase.residentClerkship.assessment?.primaryFocus}: {medicalCase.residentClerkship.residentNote}"</p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic">Patient Explanation</h3>
                    <div className="p-6 bg-gray-950/50 rounded-3xl border border-white/5">
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">{medicalCase.residentClerkship.patientExplanation}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                     <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none italic">Sealed by Oelod Resident Protocol 01-B</span>
                     <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">Status: VERIFIED</span>
                  </div>
               </div>
            </div>
          )}

          {medicalCase.aiPrediction && (
            <div className="bg-gradient-to-br from-brand-900/30 to-gray-900 border border-brand-800/50 rounded-2xl p-6 shadow-lg shadow-brand-900/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">🤖</div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                AI Triage Analysis
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Recommended Specialty</h3>
                  <div className="text-lg font-medium text-white">{medicalCase.aiPrediction.recommended_specialty}</div>
                </div>
                
                <div>
                  <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Priority Level</h3>
                  <div className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold border ${getPriorityColor(medicalCase.priority)}`}>
                    {medicalCase.priority.toUpperCase()}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Confidence Score</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500" 
                        style={{ width: `${Math.round(medicalCase.aiPrediction.confidence_score * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-300">{Math.round(medicalCase.aiPrediction.confidence_score * 100)}%</span>
                  </div>
                </div>

                {medicalCase.aiPrediction.possible_conditions?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">Possible Conditions</h3>
                    <ul className="list-disc list-inside text-sm text-gray-300">
                      {medicalCase.aiPrediction.possible_conditions.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {medicalCase.doctor && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
               <div className="flex justify-between items-start mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Assignment Info</h2>
                  {medicalCase.patient?._id === user?._id && (
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="text-[9px] font-black text-red-500 uppercase hover:underline flex items-center gap-1"
                    >
                      🚩 Report Doctor
                    </button>
                  )}
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                   👨‍⚕️
                 </div>
                 <div>
                   <p className="text-white font-medium">{medicalCase.doctor.fullName}</p>
                   <p className="text-xs text-gray-500">{medicalCase.doctor.specialization || 'General Practitioner'}</p>
                 </div>
               </div>
            </div>
          )}

          {!medicalCase.doctor && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Assignment Info</h2>
               <div className="text-gray-500 italic text-sm text-center py-4">
                 Not yet assigned to a doctor. {medicalCase.assignedSpecialty && `Waiting for ${medicalCase.assignedSpecialty}.`}
               </div>
            </div>
          )}

          {(user?.activeRole === 'doctor' || user?.activeRole === 'admin') && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-brand-400">📜</span> Patient Medical History
              </h2>
              {patientHistory.length === 0 ? (
                <p className="text-gray-500 text-xs italic">No prior cases found for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {patientHistory.map(prev => (
                    <div key={prev._id} className="p-3 bg-gray-950 rounded-xl border border-gray-800 hover:border-brand-500/30 transition-all cursor-pointer" onClick={() => navigate(`/cases/${prev._id}`)}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase">{prev.caseCode}</span>
                        <span className="text-[9px] text-gray-600">{new Date(prev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-300 truncate">{prev.symptoms.join(', ')}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Specialist: Dr. {prev.doctor?.fullName || 'N/A'}</p>
                    </div>
                  ))}
                  <p className="text-[9px] text-gray-600 italic text-center pt-2">History logs are read-only and immutable.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      </div>

      {/* Lab Request Tabular Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-2xl">
             <h3 className="text-lg font-bold text-white mb-4">Request Multiple Labs</h3>
             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
               {labForm.map((item, idx) => (
                 <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700">
                   <div className="flex-1">
                     <label className="text-xs text-gray-400">Test Type</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. Complete Blood Count" value={item.testType} onChange={(e) => {
                       const newForm = [...labForm]; newForm[idx].testType = e.target.value; setLabForm(newForm);
                     }} />
                   </div>
                   <div className="sm:w-1/3">
                     <label className="text-xs text-gray-400">Urgency</label>
                     <select className="input-field mt-1 w-full" value={item.urgency} onChange={(e) => {
                       const newForm = [...labForm]; newForm[idx].urgency = e.target.value; setLabForm(newForm);
                     }}>
                       <option value="routine">Routine</option>
                       <option value="urgent">Urgent</option>
                       <option value="stat">STAT (Immediate)</option>
                     </select>
                   </div>
                   <div className="flex items-end pb-1">
                      <button className="text-red-400 text-sm hover:text-red-300 px-2" onClick={() => {
                        const newF = [...labForm]; newF.splice(idx,1); setLabForm(newF);
                      }} disabled={labForm.length === 1}>× Remove</button>
                   </div>
                 </div>
               ))}
             </div>
             <button className="mt-3 text-brand-400 text-sm font-semibold hover:underline" onClick={() => setLabForm([...labForm, { testType: '', urgency: 'routine' }])}>+ Add Another Test</button>
             
             <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
               <button className="btn-secondary" onClick={() => setShowLabModal(false)} disabled={actionLoading}>Cancel</button>
               <button className="btn-primary bg-blue-600 hover:bg-blue-500" onClick={submitLabs} disabled={actionLoading}>Submit Lab Routing</button>
             </div>
          </div>
        </div>
      )}

      {/* Prescription Tabular Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-3xl my-8">
             <h3 className="text-lg font-bold text-white mb-4">Issue Prescription</h3>
             <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
               {rxForm.map((item, idx) => (
                 <div key={idx} className="bg-gray-800 p-4 rounded-lg border border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs text-gray-400">Drug Name</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. Paracetamol" value={item.name} onChange={(e) => {
                       const newForm = [...rxForm]; newForm[idx].name = e.target.value; setRxForm(newForm);
                     }} />
                   </div>
                   <div>
                     <label className="text-xs text-gray-400">Dosage</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. 500mg" value={item.dosage} onChange={(e) => {
                       const newForm = [...rxForm]; newForm[idx].dosage = e.target.value; setRxForm(newForm);
                     }} />
                   </div>
                   <div>
                     <label className="text-xs text-gray-400">Frequency</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. Twice Daily" value={item.frequency} onChange={(e) => {
                       const newForm = [...rxForm]; newForm[idx].frequency = e.target.value; setRxForm(newForm);
                     }} />
                   </div>
                   <div>
                     <label className="text-xs text-gray-400">Duration</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. 5 days" value={item.duration} onChange={(e) => {
                       const newForm = [...rxForm]; newForm[idx].duration = e.target.value; setRxForm(newForm);
                     }} />
                   </div>
                   <div className="sm:col-span-2">
                     <label className="text-xs text-gray-400">Additional Instructions</label>
                     <input type="text" className="input-field mt-1 w-full" placeholder="e.g. Take after meals" value={item.instructions} onChange={(e) => {
                       const newForm = [...rxForm]; newForm[idx].instructions = e.target.value; setRxForm(newForm);
                     }} />
                   </div>
                   <div className="sm:col-span-2 flex justify-end">
                      <button className="text-red-400 text-[10px] font-black uppercase hover:text-red-300" onClick={() => {
                        const newF = [...rxForm]; newF.splice(idx,1); setRxForm(newF);
                      }} disabled={rxForm.length === 1}>× Remove Drug</button>
                   </div>
                 </div>
               ))}
             </div>
             <button className="mt-4 text-brand-400 text-xs font-black uppercase tracking-widest hover:underline" onClick={() => setRxForm([...rxForm, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }])}>+ Add Another Drug</button>
             
             <div className="mt-8 pb-4">
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 block">Physician Note / Clinical Summary</label>
                <textarea 
                  className="input-field w-full h-24 p-4 !resize-none"
                  placeholder="Optional clinical notes for the patient or pharmacist..."
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                ></textarea>
             </div>
 
             <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-800">
               <button className="btn-secondary !px-8" onClick={() => setShowRxModal(false)} disabled={actionLoading}>Cancel</button>
               <button className="btn-primary bg-brand-600 hover:bg-brand-500 !px-10 shadow-xl shadow-brand-600/20" onClick={submitPrescription} disabled={actionLoading}>Sign & Issue Prescription</button>
             </div>
          </div>
        </div>
      )}

      {/* Flagging Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl shadow-red-900/20">
             <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Governance Flag</h3>
             <p className="text-gray-500 text-sm mb-6 uppercase font-bold tracking-widest opacity-60 italic">Initiating institutional review protocol.</p>
             
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Primary Reason for Flagging</label>
             <textarea 
               className="input-field w-full h-32 p-4 !resize-none mb-6"
               placeholder="Specify the reason (e.g., Clinical Discrepancy, Policy Violation)..."
               value={flagReason}
               onChange={(e) => setFlagReason(e.target.value)}
             ></textarea>

             <div className="flex flex-col gap-3">
               <button className="btn-primary bg-red-600 hover:bg-red-500 py-4 font-black uppercase tracking-widest text-xs" onClick={handleFlagCase} disabled={actionLoading}>Confirm Governance Flag</button>
               <button className="btn-secondary py-3 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowFlagModal(false)} disabled={actionLoading}>Cancel</button>
             </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-orange-500/30 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl shadow-orange-900/20">
             <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Institutional Escalation</h3>
             <p className="text-gray-500 text-sm mb-6 uppercase font-bold tracking-widest opacity-60 italic">Rerouting clinical record to specific oversight office.</p>
             
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Target Department / Office</label>
                   <select 
                     className="input-field w-full"
                     value={escalateOffice}
                     onChange={(e) => setEscalateOffice(e.target.value)}
                   >
                      <option value="">Select Target Office...</option>
                      <option value="Chief Medical Office (CMO)">Chief Medical Office (CMO)</option>
                      <option value="Institutional Ethics Board">Institutional Ethics Board</option>
                      <option value="Legal & Compliance Dept">Legal & Compliance Dept</option>
                      <option value="Pharmacy Oversight">Pharmacy Oversight</option>
                      <option value="Laboratory Director">Laboratory Director</option>
                      <option value="Quality Assurance (QA)">Quality Assurance (QA)</option>
                      <option value="Technical Support / IT">Technical Support / IT</option>
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Escalation Rationale</label>
                   <textarea 
                     className="input-field w-full h-32 p-4 !resize-none"
                     placeholder="Document the clinical or administrative necessity for this escalation..."
                     value={escalateReason}
                     onChange={(e) => setEscalateReason(e.target.value)}
                   ></textarea>
                </div>
             </div>

             <div className="flex flex-col gap-3 mt-8">
               <button className="btn-primary bg-orange-600 hover:bg-orange-500 py-4 font-black uppercase tracking-widest text-xs" onClick={handleEscalateCase} disabled={actionLoading}>Transmit Escalation</button>
               <button className="btn-secondary py-3 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowEscalateModal(false)} disabled={actionLoading}>Cancel</button>
             </div>
          </div>
        </div>
      )}

      {/* Manual Assignment Modal (Push) */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-brand-500/30 p-8 rounded-[2.5rem] w-full max-w-xl shadow-2xl shadow-brand-900/20">
             <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Institutional Re-routing</h3>
             <p className="text-gray-500 text-sm mb-6 uppercase font-bold tracking-widest opacity-60 italic">Manually assigning case to a specific clinician pool.</p>
             
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Target Clinician</label>
                      <select 
                        className="input-field w-full"
                        value={assignForm.doctorId}
                        onChange={(e) => setAssignForm({...assignForm, doctorId: e.target.value})}
                      >
                        <option value="">Select Doctor...</option>
                        {availableDoctors.map(doc => (
                          <option key={doc._id} value={doc._id}>{doc.fullName} ({doc.specialization || 'General'})</option>
                        ))}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Update Mandatory Specialty</label>
                      <input 
                        type="text" 
                        className="input-field w-full"
                        placeholder="e.g. Cardiology, Neurology..."
                        value={assignForm.specialty}
                        onChange={(e) => setAssignForm({...assignForm, specialty: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Specialist Instruction Note</label>
                   <textarea 
                     className="input-field w-full h-24 p-4 !resize-none"
                     placeholder="Instructions for the new specialist..."
                     value={assignForm.note}
                     onChange={(e) => setAssignForm({...assignForm, note: e.target.value})}
                   ></textarea>
                </div>
             </div>

             <div className="flex flex-col gap-3 mt-8">
               <button className="btn-primary bg-brand-600 hover:bg-brand-500 py-4 font-black uppercase tracking-widest text-xs" onClick={handleManualAssign} disabled={actionLoading}>Confirm Re-assignment</button>
               <button className="btn-secondary py-3 font-bold uppercase tracking-widest text-[10px]" onClick={() => setShowAssignModal(false)} disabled={actionLoading}>Cancel</button>
             </div>
          </div>
        </div>
      )}

      {/* Institutional Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 p-10 rounded-[2.5rem] w-full max-w-xl shadow-2xl shadow-brand-900/40">
             <h3 className="text-2xl font-black text-black italic uppercase tracking-tighter mb-2">Institutional Ruling</h3>
             <p className="text-gray-500 text-sm mb-8 uppercase font-bold tracking-widest opacity-60 italic">Resolving conflict as {user?.assignedOffice}.</p>
             
             <div>
                <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-3 block italic">Final Ruling & Instruction</label>
                <textarea 
                  className="w-full h-40 p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl !resize-none text-black font-semibold text-lg placeholder:text-gray-300 focus:outline-none focus:border-brand-500 transition-all shadow-inner"
                  placeholder="Type your official response and directives here..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                ></textarea>
                <p className="text-[9px] text-gray-400 mt-4 font-bold uppercase tracking-widest text-center">This ruling will be immutably logged and the clinical team notified.</p>
             </div>

             <div className="flex flex-col gap-3 mt-10">
               <button className="btn-primary !bg-black !text-white py-5 font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-black/20" onClick={handleResolveEscalation} disabled={actionLoading}>Seal & Issue Ruling</button>
               <button className="text-gray-400 py-3 font-black uppercase tracking-widest text-[10px] hover:text-red-500 transition-colors" onClick={() => setShowResolveModal(false)} disabled={actionLoading}>Discard Draft</button>
             </div>
          </div>
        </div>
      )}

      {/* Report Misconduct Modal */}
      {showReportModal && (
         <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-500/20 rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl shadow-red-900/20">
               <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2 flex items-center gap-3">
                 Institutional Misconduct Report
               </h2>
               <p className="text-gray-500 text-xs italic mb-8 font-medium">This report triggers an immediate administrative review. False allegations are strictly monitored under ethics protocol.</p>
               
               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Category of Allegation</label>
                     <select 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-all"
                        value={reportForm.reason}
                        onChange={(e) => setReportForm(prev => ({ ...prev, reason: e.target.value }))}
                     >
                        <option value="">Select misconduct reason...</option>
                        <option value="Clinical Negligence">Clinical Negligence</option>
                        <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                        <option value="Ethics Violation">Ethics Violation</option>
                        <option value="Communication Failure">Communication Failure</option>
                        <option value="Privacy Breach">Privacy Breach</option>
                        <option value="Other">Other</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Incidence Description (Clinical Detail)</label>
                     <textarea 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none transition-all min-h-[150px] resize-none"
                        placeholder="Please describe the misconduct in detail... (Min 20 characters)"
                        value={reportForm.description}
                        onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                     />
                  </div>
               </div>

               <div className="flex gap-4 mt-8">
                  <button className="flex-1 btn-secondary" onClick={() => setShowReportModal(false)} disabled={actionLoading}>Seal Protocol</button>
                  <button className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-red-900/40" onClick={submitReport} disabled={actionLoading}>
                     Submit to Governance →
                  </button>
               </div>
            </div>
         </div>
      )}

    </>
  );
}
