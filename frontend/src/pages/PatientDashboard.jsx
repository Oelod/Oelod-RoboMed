import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axiosInstance';
import SearchBar from '../components/SearchBar';
import { getMyReports } from '../api/reports';
import { PageSpinner } from '../components/PageSpinner';
import * as cryptoService from '../services/cryptoService';
import { useState } from 'react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [backupPhrase, setBackupPhrase] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  
  const handleIdentityBackup = async (e) => {
     e.preventDefault();
     if (!backupPhrase) return;
     setIsBackingUp(true);
     setBackupStatus(null);
     try {
        await cryptoService.backupIdentity(user._id, backupPhrase);
        setBackupStatus({ success: true, message: 'Account security key securely backed up.' });
        setBackupPhrase('');
     } catch (err) {
        const msg = err.message.includes('Missing') 
           ? 'Local Identity Missing: Please restore your account first.'
           : 'Secure connection failed: System interrupted.';
        setBackupStatus({ success: false, message: msg });
     } finally {
        setIsBackingUp(false);
     }
  };

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data.data),
  });

  const { data: casesData } = useQuery({
    queryKey: ['my-cases'],
    queryFn: () => api.get('/cases').then((r) => r.data.data),
  });

  const { data: reportsData } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => getMyReports().then(res => res.data),
  });

  if (isLoading) return <PageSpinner />;

  const stats = summary?.stats || {};
  const cases = casesData?.cases || [];
  const reports = reportsData?.reports || [];

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-12 pb-10 border-b border-white/5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">
              Welcome back, <br className="sm:hidden"/> {user?.fullName?.replace(/^Dr\.\s+/i, '').split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-3 italic">Patient ID: <span className="text-gray-300 font-bold">{user?.hospitalId}</span> · Healthcare Profile</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
             <div className="w-full sm:w-80">
                <SearchBar placeholder="Search your history..." />
             </div>
             <Link to="/cases/new" className="btn-primary w-full sm:w-auto !px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-600/20 text-center">+ Start New Consultation</Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          <StatCard label="Total Medical Records"  value={stats.totalCases  ?? 0} color="brand" />
          <StatCard label="Active Consultations"   value={stats.openCases   ?? 0} color="warning" />
          <StatCard label="Resolved Cases" value={stats.closedCases ?? 0} color="success" />
        </div>

        {/* Case list */}
        <div className="card !p-4 sm:!p-8">
          <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-8 bg-white/5 p-4 rounded-xl border border-white/5 inline-block">📋 My Medical History</h2>
          {cases.length === 0 ? (
            <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
               <div className="text-5xl mb-6 opacity-30">🏜️</div>
               <p className="text-gray-500 text-sm italic font-medium"> No clinical records found in your profile. <br/> <Link to="/cases/new" className="text-brand-400 font-bold underline mt-4 inline-block">Start your first consultation →</Link></p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cases.map((c) => (
                <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-500/40 hover:bg-white/10 transition-all group">
                  <div>
                    <p className="font-black text-white text-xl italic tracking-tighter group-hover:text-brand-400 transition-colors uppercase leading-none">{c.caseCode}</p>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2.5 opacity-60">
                      {c.assignedSpecialty || 'General Screening'} 
                      {c.doctor && <span className="text-brand-500 ml-2 font-bold italic">· Dr. {c.doctor.fullName}</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-6 sm:pt-0">
                    <div className="flex gap-2">
                       <PriorityBadge priority={c.priority} />
                       <StatusBadge status={c.status} />
                    </div>
                    <Link to={`/cases/${c._id}`} className="text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 bg-white/10 rounded-xl hover:bg-brand-600 transition-all shadow-lg active:scale-95">View Record →</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Advocacy Section */}
        {reports.length > 0 && (
          <div className="card mt-12 !p-4 sm:!p-8 border-t-4 border-t-brand-600">
            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-8 bg-white/5 p-4 rounded-xl border border-white/5 inline-block">⚖️ Patient Advocacy Center</h2>
            <div className="space-y-4">
              {reports.map((r) => (
                <div key={r._id} className="p-6 rounded-2xl bg-white/5 border border-white/5">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <p className="text-white font-black uppercase tracking-widest text-xs mb-1">Doctor: Dr. {r.targetDoctor?.fullName}</p>
                         <p className="text-gray-500 text-[10px] font-medium italic">Handled by: {r.escalationTarget || 'System Administration'}</p>
                      </div>
                      <StatusBadge status={r.status} />
                   </div>
                   
                   <p className="text-gray-300 text-sm mb-6 pb-6 border-b border-white/5">
                      <span className="text-brand-400 font-bold uppercase text-[10px] block mb-2 tracking-widest">Report Detail:</span>
                      "{r.description || r.reason}"
                   </p>
 
                   {r.resolution?.note && (
                     <div className="p-4 rounded-xl bg-brand-900/10 border border-brand-500/20">
                        <p className="text-brand-400 font-black uppercase text-[10px] mb-2 tracking-widest leading-none">Result:</p>
                        <p className="text-gray-200 text-sm italic font-medium">"{r.resolution.note}"</p>
                        <p className="text-gray-500 text-[9px] uppercase font-black mt-4">Resolved on: {new Date(r.resolution.resolvedAt).toLocaleDateString()}</p>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Section */}
        <div className="card mt-12 !p-4 sm:!p-8 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -translate-y-16 translate-x-16 border border-brand-500/10"></div>
           
           <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-4 flex items-center gap-3">
             <span className="w-8 h-8 rounded-lg bg-gray-950 border border-white/5 flex items-center justify-center text-sm not-italic">🔑</span>
             Account Security Backup
           </h2>
           <p className="text-gray-500 text-[11px] mb-4 font-medium max-w-xl leading-relaxed">
             Create a secure backup of your clinical identity. This allows you to safely restore your access on new devices using your security phrase.
           </p>
           
           {process.env.NODE_ENV === 'development' && (
             <div className="mb-8 p-4 rounded-xl bg-brand-900/10 border border-brand-500/20 text-[9px] font-bold text-brand-400 uppercase tracking-widest inline-block italic">
                Current Default Key: <span className="text-white font-black ml-2">RoboMed-Secure-2026</span>
             </div>
           )}
 
           <form onSubmit={handleIdentityBackup} className="max-w-md space-y-4">
              <div className="relative">
                 <input 
                   type="password" 
                   placeholder="Enter Security Recovery Phrase..." 
                   className="input !py-4 pr-12"
                   value={backupPhrase}
                   onChange={(e) => setBackupPhrase(e.target.value)}
                   disabled={isBackingUp}
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 text-xs">🔒</div>
              </div>
              
              <button 
                type="submit" 
                className="btn-primary !px-8 !py-4 text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                disabled={isBackingUp || !backupPhrase}
              >
                {isBackingUp ? 'Securing Account…' : 'Secure My Identity Now →'}
              </button>
 
              {backupStatus && (
                <div className={`mt-4 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all animate-in slide-in-from-top-2 ${backupStatus.success ? 'bg-brand-900/20 border-brand-500/30 text-brand-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                   {backupStatus.success ? '✓' : '🚨'} {backupStatus.message}
                   {!backupStatus.success && backupStatus.message.includes('Missing') && (
                      <p className="mt-2 text-gray-500 font-medium normal-case italic">Refresh the page to trigger the Identity Restoration Handshake.</p>
                   )}
                </div>
              )}
           </form>
 
           <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Institutional Security Status:</span>
              <span className={`px-2 py-0.5 rounded bg-gray-950 border text-[8px] font-black uppercase ${user?.publicKey ? 'border-brand-500/30 text-brand-400' : 'border-white/5 text-gray-600'}`}>
                 REGISTRY: {user?.publicKey ? 'ENCRYPTED & SYNCED' : 'UNSECURED'}
              </span>
              <span className={`px-2 py-0.5 rounded bg-gray-950 border text-[8px] font-black uppercase ${user?.publicKey ? 'border-brand-500/30 text-brand-400' : 'border-white/5 text-gray-600'}`}>
                 TERMINAL: {user?.publicKey ? 'SECURED' : 'UNSECURED'}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl
      ${color === 'brand' ? 'bg-brand-600/20 text-brand-400' :
        color === 'warning' ? 'bg-amber-500/20 text-amber-400' :
        'bg-green-500/20 text-green-400'}`}>
      {color === 'brand' ? '📋' : color === 'warning' ? '🔓' : '✅'}
    </div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-xs uppercase tracking-widest font-black">{label}</p>
    </div>
  </div>
);

const PriorityBadge = ({ priority }) => {
  const map = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low', critical: 'badge-high' };
  return <span className={map[priority] || 'badge-info'}>{priority?.toUpperCase() || 'N/A'}</span>;
};

const StatusBadge = ({ status }) => (
  <span className="badge badge-info">{status}</span>
);
