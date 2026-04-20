import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllReports, updateReportStatus } from '../api/reports';
import { toast } from 'react-hot-toast';

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  const [showResolveModal, setShowResolveModal] = useState(null); // report object
  const [resolveForm, setResolveForm] = useState({ status: '', escalationTarget: '', adminNote: '', resolutionNote: '' });

  const fetchReports = async () => {
    try {
      const res = await getAllReports();
      setReports(res.data.reports);
    } catch (err) {
      toast.error('Failed to load report list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdate = async () => {
    setProcessingId(showResolveModal._id);
    try {
      await updateReportStatus(showResolveModal._id, resolveForm);
      toast.success('Report updated successfully.');
      setShowResolveModal(null);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update Failure');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">Syncing Reports...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start gap-6">
         <div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Clinical Misconduct Reports</h1>
            <p className="text-gray-500 text-sm font-medium italic">Management center for reviewing staff conduct and patient safety reports.</p>
         </div>
         <button 
           onClick={() => navigate('/dashboard')}
           className="btn-secondary !px-8 py-3 text-[10px] font-black uppercase tracking-widest border-gray-800 hover:border-brand-500/50 transition-all shrink-0"
         >
           ← Back to Dashboard
         </button>
      </div>

      <div className="grid gap-6">
        {reports.length === 0 ? (
          <div className="p-20 border-2 border-dashed border-gray-800 rounded-[3rem] text-center">
             <div className="text-6xl mb-6">⚖️</div>
             <p className="text-gray-500 font-black uppercase tracking-widest">No clinical conduct allegations recorded.</p>
          </div>
        ) : (
          reports.map(report => (
            <div key={report._id} className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden hover:border-red-500/20 transition-all group">
               <div className="px-8 py-4 bg-gray-950/50 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                        report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        report.status === 'escalated' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        report.status === 'resolved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        'bg-gray-800 text-gray-400'
                     }`}>
                        {report.status} {report.escalationTarget && `→ ${report.escalationTarget}`}
                     </span>
                     <span className="text-[10px] font-mono text-gray-600 uppercase">Registry ID: {report._id.slice(-8)}</span>
                  </div>
                  <button 
                    disabled={report.status === 'resolved'}
                    onClick={() => {
                        setShowResolveModal(report);
                        setResolveForm({ status: report.status, escalationTarget: report.escalationTarget || '', adminNote: '', resolutionNote: '' });
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl transition-all ${
                        report.status === 'resolved' ? 'text-gray-600 border border-gray-800' : 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/20'
                    }`}
                  >
                    Manage Record →
                  </button>
               </div>

               <div className="p-8 grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Patient Allegation (Reporter)</span>
                        <p className="text-white font-bold">{report.reporter?.fullName}</p>
                        <p className="text-xs text-gray-500 italic">{report.reporter?.email}</p>
                     </div>
                     <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Target Clinician</span>
                        <p className="text-white font-bold">Dr. {report.targetDoctor?.fullName}</p>
                        <p className="text-xs text-brand-400 font-bold uppercase tracking-tighter">{report.targetDoctor?.specialization?.join(', ') || 'Generalist'}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <span className="text-[10px] font-black text-red-500/60 uppercase tracking-widest block mb-2">Category: {report.reason}</span>
                        <p className="text-gray-300 text-sm italic leading-relaxed font-medium">"{report.description}"</p>
                     </div>
                     <div className="pt-4 border-t border-gray-800">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Clinical Context</span>
                        <a href={`/cases/${report.caseId?._id}`} className="text-blue-400 text-xs font-bold uppercase hover:underline">View Case {report.caseId?.caseCode} →</a>
                     </div>
                  </div>
               </div>

               {report.adminNotes?.length > 0 && (
                  <div className="px-8 py-4 bg-gray-950/20 border-t border-gray-800">
                     <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Internal Management Logs</span>
                     {report.adminNotes.map((n, i) => (
                        <p key={i} className="text-[11px] text-gray-400 italic mb-1 border-l border-gray-800 pl-3">"{n.note}"</p>
                     ))}
                  </div>
               )}
            </div>
          ))
        )}
      </div>

      {/* Management Modal */}
      {showResolveModal && (
         <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-brand-500/20 rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl shadow-brand-900/20">
               <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-6 flex items-center gap-3">
                 Manage Report Details
               </h2>
               
               <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Record Status</label>
                     <select 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand-500 outline-none transition-all"
                        value={resolveForm.status}
                        onChange={(e) => setResolveForm(prev => ({ ...prev, status: e.target.value }))}
                     >
                        <option value="pending">Pending Review</option>
                        <option value="under_review">Under Active Review</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved / Closed</option>
                        <option value="dismissed">Dismissed</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Escalation Target</label>
                     <select 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand-500 outline-none transition-all"
                        value={resolveForm.escalationTarget}
                        onChange={(e) => setResolveForm(prev => ({ ...prev, escalationTarget: e.target.value }))}
                     >
                        <option value="">None / Internal Only</option>
                        <option value="Chief Medical Office (CMO)">Chief Medical Office (CMO)</option>
                        <option value="Disciplinary Committee">Disciplinary Committee</option>
                        <option value="Legal Dept">Legal & Compliance</option>
                     </select>
                  </div>
               </div>

               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Internal Note (Private)</label>
                     <textarea 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand-500 outline-none transition-all h-24 resize-none"
                        placeholder="Add internal administrative note..."
                        value={resolveForm.adminNote}
                        onChange={(e) => setResolveForm(prev => ({ ...prev, adminNote: e.target.value }))}
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-green-500 uppercase tracking-widest block mb-2">Formal Resolution Note (Seals Record)</label>
                     <textarea 
                        className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand-500 outline-none transition-all h-24 resize-none"
                        placeholder="Provide formal resolution context to seal this record..."
                        value={resolveForm.resolutionNote}
                        onChange={(e) => setResolveForm(prev => ({ ...prev, resolutionNote: e.target.value }))}
                     />
                  </div>
               </div>

               <div className="flex gap-4 mt-8">
                  <button className="flex-1 btn-secondary" onClick={() => setShowResolveModal(null)} disabled={processingId}>Cancel</button>
                  <button 
                    disabled={processingId}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all" 
                    onClick={handleUpdate}
                  >
                     {processingId ? 'Syncing...' : 'Update Record →'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
