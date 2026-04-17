import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axiosInstance';
import SearchBar from '../components/SearchBar';

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data.data),
  });

  const { data: casesData } = useQuery({
    queryKey: ['my-cases'],
    queryFn: () => api.get('/cases').then((r) => r.data.data),
  });

  if (isLoading) return <PageSpinner />;

  const stats = summary?.stats || {};
  const cases = casesData?.cases || [];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-12 pb-10 border-b border-gray-900">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">
              Welcome back, <br className="sm:hidden"/> {user?.fullName?.replace(/^Dr\.\s+/i, '').split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-3 italic">Institutional PID: <span className="text-gray-300 font-bold">{user?.hospitalId}</span> · Clinical Profile</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
             <div className="w-full sm:w-80">
                <SearchBar placeholder="Search your records..." />
             </div>
             <Link to="/cases/new" id="new-case-btn" className="btn-primary w-full sm:w-auto !px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-600/20 active:scale-95 transition-all">+ Open New Case Node</Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          <StatCard label="Total Case Nodes"  value={stats.totalCases  ?? 0} color="brand" />
          <StatCard label="Active Pipeline"   value={stats.openCases   ?? 0} color="warning" />
          <StatCard label="Closed Archives" value={stats.closedCases ?? 0} color="success" />
        </div>

        {/* Case list */}
        <div className="card !p-4 sm:!p-8">
          <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-8 bg-gray-950/50 p-4 rounded-xl border border-gray-800 inline-block">📋 My Clinical Portfolio</h2>
          {cases.length === 0 ? (
            <div className="py-20 text-center bg-gray-950/50 rounded-[3rem] border border-gray-900">
               <div className="text-5xl mb-6 opacity-30">🏜️</div>
               <p className="text-gray-500 text-sm italic font-medium"> No clinical nodes detected in your portfolio. <br/> <Link to="/cases/new" className="text-brand-400 font-bold underline mt-4 inline-block">Initialize your first case node →</Link></p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cases.map((c) => (
                <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-brand-500/40 hover:bg-gray-850 transition-all group">
                  <div>
                    <p className="font-black text-white text-xl italic tracking-tighter group-hover:text-brand-400 transition-colors uppercase leading-none">{c.caseCode}</p>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2.5 opacity-60">
                      {c.assignedSpecialty || 'Institutional Screening'} 
                      {c.doctor && <span className="text-brand-500 ml-2 font-bold italic">· Dr. {c.doctor.fullName}</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-800/50 pt-6 sm:pt-0">
                    <div className="flex gap-2">
                       <PriorityBadge priority={c.priority} />
                       <StatusBadge status={c.status} />
                    </div>
                    <Link to={`/cases/${c._id}`} className="text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 bg-gray-800 rounded-xl hover:bg-brand-600 transition-all shadow-lg active:scale-95">View Node →</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
      <p className="text-gray-400 text-sm">{label}</p>
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

const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
  </div>
);
