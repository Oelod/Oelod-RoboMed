import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../hooks/useAuth';
import SearchBar from '../components/SearchBar';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Real-time Update Receiver
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    
    // Connect to the department
    if (user?.specialization) {
      socket.emit('join_specialty', `specialty_${user.specialization}`);
    }

    socket.on('case_update', (data) => {
       if (data.type === 'RESIDENT_CLERKSHIP_SEALED') {
          toast.success(`🆘 NEW PATIENT UPDATE: ${data.message}`, {
             duration: 8000,
             position: 'top-right',
             style: { background: '#1e1b4b', color: '#818cf8', border: '1px solid #4338ca', fontWeight: 'bold' }
          });
          queryClient.invalidateQueries(['doctor-all-cases']);
          queryClient.invalidateQueries(['dashboard-summary']);
       }
    });

    return () => socket.disconnect();
  }, [user, queryClient]);
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data.data),
  });

  const { data: allCasesData } = useQuery({
    queryKey: ['doctor-all-cases'],
    queryFn: () => api.get('/cases').then((r) => r.data.data),
  });

  const stats = summary?.stats || {};
  const allCases = allCasesData?.cases || [];

  const assignedCases = allCases.filter(c => c.doctor && c.doctor._id === user._id && c.status !== 'closed');
  const openCases = allCases.filter(c => c.status === 'open');
  const closedCases = allCases.filter(c => c.doctor && c.doctor._id === user._id && c.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Clinical Workspace 🩺</h1>
            <p className="text-gray-500 mt-1">Logged in as {user.fullName} ({user.licenseNumber || 'Verified Specialist'})</p>
          </div>
          <SearchBar placeholder="Search clinical records..." />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Assigned Cases"  value={stats.assignedCases ?? 0} emoji="📌" />
          <StatCard label="Open in Specialty" value={stats.openCases ?? 0} emoji="🔓" />
          <StatCard label="Closed Cases"    value={stats.closedCases ?? 0} emoji="✅" />
        </div>

        <div className="space-y-6">
          {/* Active / Assigned Cases */}
          <div className="card !p-4 sm:!p-6">
            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-6">📌 My Assigned Cases</h2>
            {assignedCases.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-12 bg-gray-950/50 rounded-2xl border border-gray-900 leading-relaxed">Workspace notice: <br/> No active patient records found in your queue.</p>
            ) : (
              <ul className="space-y-4">
                {assignedCases.map((c) => (
                  <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-brand-900/10 border border-brand-500/20 group hover:border-brand-500 transition-all">
                    <div>
                      <p className="font-black text-white text-lg italic tracking-tighter group-hover:text-brand-400 transition-colors uppercase leading-tight">{c.caseCode}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60 italic">{c.patient?.fullName || 'Patient'} · {c.assignedSpecialty}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-800/50 pt-4 sm:pt-0">
                      <span className={`badge ${c.priority === 'high' ? 'badge-high' : c.priority === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                        {c.priority?.toUpperCase()}
                      </span>
                      <Link to={`/cases/${c._id}`} className="btn-primary !px-6 py-2 py-2.5 text-[10px] uppercase font-black tracking-widest">Manage Case →</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Open Case Queue */}
          <div className="card !p-4 sm:!p-6 border-gray-800/50">
            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              🔓 Available Case Queue
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] font-normal">Relevant to your specialization</span>
            </h2>
            {openCases.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-12 bg-gray-950/50 rounded-2xl border border-gray-900">No unassigned clinical cases found.</p>
            ) : (
              <ul id="case-queue-list" className="space-y-4">
                {openCases.map((c) => (
                  <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-brand-500/50 transition-all group">
                    <div>
                      <p className="font-black text-white text-lg italic tracking-tighter group-hover:text-brand-400 transition-colors uppercase leading-tight">{c.caseCode}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1.5 opacity-60 italic">{c.patient?.fullName || 'Patient'} · {c.assignedSpecialty}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-800/50 pt-4 sm:pt-0">
                      <span className={`badge ${c.priority === 'high' ? 'badge-high' : c.priority === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                        {c.priority?.toUpperCase()}
                      </span>
                      <Link to={`/cases/${c._id}`} className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 border border-brand-500/30 rounded-xl hover:bg-brand-500 hover:text-black hover:border-brand-500 transition-all">View & Accept</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Past / Closed Cases */}
          <div className="card border border-gray-800/50 opacity-80">
            <h2 className="text-lg font-semibold text-gray-300 mb-4 flex justify-between items-center">
              My Clinical History
              <span className="text-xs text-gray-500 font-normal">Closed Cases (Read-only)</span>
            </h2>
            {closedCases.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">You have no closed cases.</p>
            ) : (
              <ul className="space-y-3">
                {closedCases.map((c) => (
                  <li key={c._id} className="flex items-center justify-between p-4 rounded-xl bg-gray-900 border border-gray-800">
                    <div>
                      <p className="font-medium text-gray-400 text-sm">{c.caseCode}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{c.patient?.fullName || 'Patient'} · Closed securely</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-500 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded">Closed</span>
                      <Link to={`/cases/${c._id}`} className="text-gray-400 text-xs hover:text-white py-1px px-2 transition-colors">Review</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, emoji }) => (
  <div className="card flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-xl">{emoji}</div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  </div>
);
