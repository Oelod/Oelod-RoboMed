import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('queue'); // 'queue' | 'history'

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['pharmacy-queue'],
    queryFn: () => api.get('/departments/pharmacy/queue').then(res => res.data.data.queue)
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['pharmacy-history'],
    queryFn: () => api.get('/departments/pharmacy/history').then(res => res.data.data.history),
    enabled: tab === 'history'
  });

  const queue = queueData || [];
  const history = historyData || [];
  const loading = queueLoading || (tab === 'history' && historyLoading);

  const handleDispense = async (rxId) => {
    if (!window.confirm('LEGAL VERIFICATION: Have you dispensed the correct medications, dosage, and duration as prescribed?')) return;

    setProcessing(true);
    try {
      await api.patch(`/departments/pharmacy/prescriptions/${rxId}/dispense`);
      toast.success('Pharmaceutical Order Dispensed & Verified');
      queryClient.invalidateQueries({ queryKey: ['pharmacy-queue'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-history'] });
    } catch (err) {
      toast.error('Dispensing Protocol Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleItemUpdate = async (rxId, index, status) => {
    setProcessing(true);
    try {
      await api.patch(`/departments/pharmacy/prescriptions/${rxId}/item/${index}`, { status });
      toast.success(`Unit ${status.toUpperCase()} recorded.`);
      queryClient.invalidateQueries({ queryKey: ['pharmacy-queue'] });
    } catch (err) {
      toast.error('Update Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading && tab === 'queue' && queue.length === 0) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-10">
       <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-6"></div>
       <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.5em] animate-pulse">Initializing Pharmaceutical Terminal...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-12 selection:bg-brand-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* Institutional Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-10 sm:mb-16 pb-12 border-b border-gray-900">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <span className="w-3 h-3 bg-brand-500 rounded-full shadow-[0_0_15px_rgba(var(--brand-500),0.5)]"></span>
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Medication Control Unit</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter">Pharmacy Console</h1>
              <p className="text-gray-500 mt-2 text-xs sm:text-sm font-medium">Pharmacist: <span className="text-gray-300 font-bold">{user.fullName}</span> · Station: Primary Dispensary</p>
           </div>
           
           <div className="flex bg-gray-900 p-1 rounded-xl sm:rounded-2xl border border-gray-800 shadow-inner w-full sm:w-auto">
              <button 
                onClick={() => setTab('queue')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 ${tab === 'queue' ? 'bg-gray-800 text-brand-400 border border-gray-700 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Pending
                <span className={`px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] ${tab === 'queue' ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-600'}`}>{queue.length}</span>
              </button>
              <button 
                onClick={() => setTab('history')}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 sm:gap-3 ${tab === 'history' ? 'bg-gray-800 text-white border border-gray-700 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
              >
                History
                <span className={`px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] ${tab === 'history' ? 'bg-white/10 text-gray-300' : 'bg-gray-800 text-gray-600'}`}>{history.length}</span>
              </button>
           </div>
        </div>

        {tab === 'queue' ? (
          <div className="space-y-8">
            {queue.length === 0 ? (
              <div className="py-32 text-center bg-gray-900/10 border border-gray-900 rounded-[3rem] opacity-40">
                 <div className="text-6xl mb-6">💊</div>
                 <p className="text-lg font-black text-white italic uppercase tracking-tighter">All prescriptions have been dispensed</p>
              </div>
            ) : (
              queue.map((rx) => (
                <div key={rx._id} className="card group border-gray-800/50 hover:border-gray-700 transition-all duration-300 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors"></div>
                   
                   {/* Top Info Bar */}
                   <div className="flex flex-col xl:flex-row justify-between gap-10 mb-10 pb-10 border-b border-gray-800/60 relative z-10">
                      <div className="flex flex-wrap gap-16">
                         <div className="min-w-[240px]">
                           <span className="text-[10px] text-gray-600 font-black uppercase mb-3 block tracking-widest leading-none">Institutional Subject</span>
                           <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-brand-400 transition-colors">{rx.caseId?.patient?.fullName || 'N/A'}</h3>
                           <span className="text-[10px] text-gray-500 font-mono block mt-2 uppercase tracking-widest">PID: {rx.caseId?._id?.slice(-12).toUpperCase()}</span>
                         </div>
                         <div className="min-w-[180px]">
                           <span className="text-[10px] text-gray-600 font-black uppercase mb-3 block tracking-widest leading-none">Prescribing MD</span>
                           <h3 className="text-xl font-bold text-gray-300 italic uppercase tracking-tight">Dr. {rx.doctorId?.fullName}</h3>
                           <span className="text-[10px] text-gray-600 uppercase font-black tracking-widest block mt-2">{new Date(rx.issuedAt).toLocaleString()}</span>
                         </div>
                      </div>
                      
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleDispense(rx._id)}
                          disabled={processing}
                          className="btn-primary w-full xl:w-auto px-12 py-5 text-[10px] uppercase tracking-[0.2em] font-black shadow-2xl shadow-brand-900/20 active:scale-95 transition-all"
                        >
                          {processing ? 'Processing Module...' : '✔ Verify & Dispense'}
                        </button>
                      </div>
                   </div>

                    {/* Medication Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                       {rx.drugs.map((drug, index) => (
                         <div key={index} className={`bg-gray-950/50 border p-8 rounded-[2rem] hover:bg-gray-900 transition-all group/drug relative ${drug.status === 'pending' ? 'border-gray-800' : drug.status === 'dispensed' ? 'border-brand-500/30 bg-brand-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
                            <div className="mb-6">
                               <h4 className="text-xl font-black text-white italic uppercase tracking-tight mb-1">{drug.name}</h4>
                               <span className="text-[9px] font-black text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded uppercase tracking-widest">{drug.status}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-10">
                               <div>
                                  <span className="text-[9px] text-gray-600 font-black uppercase block mb-1">Dosage</span>
                                  <span className="text-sm font-bold text-gray-300 uppercase">{drug.dosage}</span>
                               </div>
                               <div>
                                  <span className="text-[9px] text-gray-600 font-black uppercase block mb-1">Frequency</span>
                                  <span className="text-sm font-bold text-gray-300 uppercase italic">{drug.frequency}</span>
                               </div>
                            </div>

                            {drug.status === 'pending' ? (
                               <div className="flex gap-3 pt-6 border-t border-gray-900">
                                  <button 
                                    onClick={() => handleItemUpdate(rx._id, index, 'dispensed')}
                                    className="flex-1 py-3 bg-brand-500 text-black text-[9px] font-black uppercase rounded-xl hover:bg-white transition-all"
                                  >Dispense Unit</button>
                                  <button 
                                    onClick={() => handleItemUpdate(rx._id, index, 'external')}
                                    className="px-4 py-3 bg-gray-800 text-gray-400 text-[9px] font-black uppercase rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                                  >Source Out</button>
                               </div>
                            ) : (
                               <div className="pt-6 border-t border-gray-900 flex items-center gap-3">
                                  <span className="text-[8px] font-black px-2 py-1 bg-gray-800 text-gray-500 uppercase rounded">RECORDED @ {new Date(drug.fulfilledAt).toLocaleTimeString()}</span>
                                  <span className="text-lg">✅</span>
                               </div>
                            )}
                         </div>
                       ))}
                    </div>

                   {rx.notes && (
                      <div className="mt-10 p-6 bg-gray-950 rounded-2xl border-l-[3px] border-l-brand-600 flex gap-6 items-start relative z-10 shadow-inner">
                         <span className="text-2xl mt-1">📋</span>
                         <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Physician Commentary</p>
                            <p className="text-sm font-medium leading-relaxed text-gray-400 italic">"{rx.notes}"</p>
                         </div>
                      </div>
                   )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* History Table */
          <div className="card !p-0 overflow-hidden border-gray-900 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-900/50 text-gray-500 border-b border-gray-800">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Patient Identity</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Prescribed By</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Dispensed At</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Medications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                     {history.map(item => (
                       <tr key={item._id} className="hover:bg-brand-500/5 transition-colors group">
                          <td className="px-8 py-6">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-white italic group-hover:text-brand-400 transition-colors uppercase">{item.caseId?.patient?.fullName || 'Anonymous'}</span>
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter mt-0.5">PID: {item.caseId?._id?.slice(-8).toUpperCase()}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-xs font-bold text-gray-400 italic">Dr. {item.doctorId?.fullName}</span>
                          </td>
                          <td className="px-8 py-6 text-[10px] text-gray-500 font-black font-mono tracking-tighter uppercase whitespace-nowrap">
                            {new Date(item.fulfilledAt).toLocaleString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex gap-2 justify-end">
                                {item.drugs.slice(0, 2).map((d, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[8px] font-bold text-gray-500 uppercase rounded">{d.name}</span>
                                ))}
                                {item.drugs.length > 2 && <span className="text-[8px] text-gray-700 font-bold self-center">+{item.drugs.length - 2}</span>}
                             </div>
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
