import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function LabDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [tab, setTab] = useState('queue'); 

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['lab-queue'],
    queryFn: () => api.get('/departments/lab/queue').then(res => res.data.data.queue)
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['lab-history'],
    queryFn: () => api.get('/departments/lab/history').then(res => res.data.data.history)
  });

  const queue = queueData || [];
  const history = historyData || [];
  const loading = queueLoading || historyLoading;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedRequest) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('files', file);
    formData.append('comment', comment);

    try {
      // Logic from departmentController/labService:
      // Endpoint is /api/cases/:caseId/lab-results
      await api.post(`/cases/${selectedRequest.caseId._id}/lab-results`, formData);
      
      toast.success('Clinical Result Transmitted Successfully');
      setComment('');
      setFile(null);
      setSelectedRequest(null);
      setTab('history');
      
      queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
      queryClient.invalidateQueries({ queryKey: ['lab-history'] });
    } catch (err) {
      toast.error('Transmission Failure: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-10">
       <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-6"></div>
       <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.5em] animate-pulse">Initializing Laboratory Intelligence...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-12 selection:bg-brand-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* Institutional Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-10 sm:mb-16 pb-12 border-b border-gray-900">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <span className="w-3 h-3 bg-brand-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(var(--brand-500),0.5)]"></span>
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Live Operational Stream</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter">Laboratory Console</h1>
              <p className="text-gray-500 mt-2 text-xs sm:text-sm font-medium">Officer: <span className="text-gray-300 font-bold">{user.fullName}</span> · Clinical Unit: Advanced Diagnostics</p>
           </div>
           
           <div className="flex bg-gray-900 p-1 rounded-xl sm:rounded-2xl border border-gray-800 shadow-inner w-full sm:w-auto">
              <button 
                onClick={() => setTab('queue')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 ${tab === 'queue' ? 'bg-gray-800 text-brand-400 border border-gray-700 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Queue 
                <span className={`px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] ${tab === 'queue' ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-600'}`}>{queue.length}</span>
              </button>
              <button 
                onClick={() => setTab('history')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 ${tab === 'history' ? 'bg-gray-800 text-white border border-gray-700 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Archive
                <span className={`px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] ${tab === 'history' ? 'bg-white/10 text-gray-300' : 'bg-gray-800 text-gray-600'}`}>{history.length}</span>
              </button>
           </div>
        </div>

        {tab === 'queue' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Queue Matrix */}
            <div className="lg:col-span-12 xl:col-span-8 space-y-6">
              {queue.length === 0 ? (
                <div className="py-32 text-center bg-gray-900/10 border border-gray-900 rounded-[3rem] opacity-40">
                   <div className="text-6xl mb-6">📉</div>
                   <p className="text-lg font-black text-white italic uppercase tracking-tighter">Zero Pending Requests Identified</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {queue.map((req) => (
                    <div 
                      key={req._id} 
                      onClick={() => setSelectedRequest(req)}
                      className={`card group hover:scale-[1.02] transition-all cursor-pointer border-2 p-8 ${
                        selectedRequest?._id === req._id ? 'border-brand-500 bg-gray-900/50 shadow-[0_0_30px_rgba(var(--brand-500),0.1)]' : 'border-gray-900 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-8">
                         <div className="px-3 py-1 bg-gray-950 border border-gray-800 rounded-lg">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">ID: {req._id.slice(-6)}</span>
                         </div>
                         <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded border ${
                            req.urgency === 'stat' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            req.urgency === 'urgent' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                         }`}>
                           {req.urgency}
                         </span>
                      </div>

                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2 group-hover:text-brand-400 transition-colors uppercase">{req.testType}</h3>
                      <p className="text-xs text-gray-500 font-medium line-clamp-2 italic mb-8">"{req.notes || 'No institutional notes provided.'}"</p>

                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-800/50">
                        <div>
                           <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Subject</p>
                           <p className="text-sm font-bold text-gray-300 truncate tracking-tight">{req.caseId?.patient?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Requestor</p>
                           <p className="text-sm font-bold text-gray-500 italic">Dr. {req.doctorId?.fullName || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reporting Terminal */}
            <div className="lg:col-span-12 xl:col-span-4 sticky top-12">
               <div className={`card !p-10 border-2 transition-all duration-500 ${!selectedRequest ? 'opacity-20 grayscale pointer-events-none translate-y-10' : 'border-brand-500/30'}`}>
                  <div className="flex items-center gap-4 mb-10 pb-6 border-b border-gray-800">
                     <span className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-xl shadow-lg shadow-brand-600/20 italic font-black">!</span>
                     <div>
                        <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">Issue Findings</h2>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Diagnostic Upload</p>
                     </div>
                  </div>
                  
                  <form onSubmit={handleUpload} className="space-y-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Technical Remarks</label>
                      <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input min-h-[160px] py-4 resize-none italic font-medium"
                        placeholder="Detail observations and clinical metrics..."
                        required
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Diagnostic Data (Image/PDF)</label>
                      <div 
                        onClick={() => document.getElementById('file-upload').click()}
                        className="w-full py-8 px-6 bg-gray-950 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-500 transition-all hover:bg-gray-900/50 group"
                      >
                         <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">📄</span>
                         <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-brand-400">
                            {file ? file.name : 'Select Clinical Record'}
                         </span>
                      </div>
                      <input 
                        id="file-upload"
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])}
                        className="hidden"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={uploading} 
                      className="btn-primary w-full py-5 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-600/30"
                    >
                      {uploading ? 'Transmitting Module...' : 'Deploy Findings →'}
                    </button>
                    {selectedRequest && (
                       <button 
                         type="button" 
                         onClick={() => setSelectedRequest(null)}
                         className="w-full text-[9px] font-black text-gray-700 hover:text-gray-500 uppercase tracking-widest transition-colors"
                       >
                         Discard Selection
                       </button>
                    )}
                  </form>
               </div>
            </div>
          </div>
        ) : (
          /* Output Archive Table */
          <div className="card overflow-hidden !p-0 border-gray-900 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-900/50 text-gray-500 border-b border-gray-800">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Case Code</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Subject Identity</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Discovery Date</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Intelligence Node</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                     {history.map(item => (
                       <tr key={item._id} className="hover:bg-brand-500/5 transition-colors group">
                          <td className="px-8 py-6">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-white italic group-hover:text-brand-400 transition-colors">#{item.caseId?._id?.slice(-8).toUpperCase()}</span>
                                <span className="text-[9px] font-black text-gray-600 uppercase mt-0.5">Clinical Stream</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 italic">
                                   {item.caseId?.patient?.fullName?.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-gray-300">{item.caseId?.patient?.fullName || 'Anonymous'}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-[10px] text-gray-500 font-black font-mono tracking-tighter uppercase">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors py-2 px-4 border border-brand-500/20 rounded-xl bg-brand-500/5">
                               View Record ↗
                            </a>
                          </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
