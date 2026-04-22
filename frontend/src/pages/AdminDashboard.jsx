import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import SearchBar from '../components/SearchBar';


const PolicyCard = ({ level, rank, rights, color }) => {
  const colorMap = {
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
    orange: 'border-orange-500/30 text-orange-400 bg-orange-500/5',
    red: 'border-red-500/30 text-red-400 bg-red-500/5',
  };

  return (
    <div className={`card border ${colorMap[color]} group hover:border-white transition-all`}>
       <div className="flex justify-between items-start mb-6">
          <div>
             <h4 className="text-xl font-black italic">{level}</h4>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{rank}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">🛡️</div>
       </div>
       <ul className="space-y-4">
          {rights.map((r, i) => (
            <li key={i} className="flex items-start gap-3">
               <span className="text-white mt-1">▸</span>
               <span className="text-xs text-gray-400 font-medium">{r}</span>
            </li>
          ))}
       </ul>
    </div>
  );
};

const AdminStatCard = ({ label, value, icon }) => (
  <div className="card !p-6 flex items-center gap-6 group hover:translate-y-[-4px] transition-all bg-gray-900 border-gray-800">
     <div className="w-14 h-14 rounded-2xl bg-gray-950 flex items-center justify-center text-2xl shadow-inner border border-gray-800 group-hover:bg-brand-500 transition-all group-hover:text-black">
        {icon}
     </div>
     <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[10px] text-brand-500 font-bold uppercase tracking-[0.3em] mt-2">Personal Health Check-in</p>
        <p className="text-2xl font-black text-white italic tracking-tighter">{value}</p>
     </div>
  </div>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'patients' | 'cases' | 'reports' | 'history' | 'search' | 'migration' | 'rules' | 'audit' | 'office' | 'health' | 'research'
  const [migrationFile, setMigrationFile] = useState(null);
  const [migrationType, setMigrationType] = useState('patients'); // 'patients' | 'doctors'
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [complianceReport, setComplianceReport] = useState(null); // { patient, auditTrail, generatedAt }
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  
  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data.data),
  });

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users?limit=100').then((r) => r.data.data),
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin-audit-logs', activeTab],
    queryFn: () => api.get('/admin/audit-log?limit=200').then((r) => r.data.data),
    enabled: activeTab === 'history'
  });

  const { data: allCasesData } = useQuery({
    queryKey: ['admin-all-cases', activeTab],
    queryFn: () => api.get('/cases?limit=500').then((r) => r.data.data),
    enabled: activeTab === 'cases' || activeTab === 'rules'
  });

  const { data: officeMattersData } = useQuery({
    queryKey: ['admin-office-matters', activeTab],
    queryFn: () => api.get('/admin/escalated-matters').then((r) => r.data.data),
    enabled: activeTab === 'office'
  });

  const { data: governanceHealthData } = useQuery({
    queryKey: ['admin-governance-health', activeTab],
    queryFn: () => api.get('/admin/governance-health').then((r) => r.data.data),
    enabled: activeTab === 'health'
  });

  const users = usersData?.users || [];
  const logs = logsData?.logs || [];
  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    log.actorId?.fullName?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
    log.targetId?.fullName?.toLowerCase().includes(auditSearchTerm.toLowerCase())
  );

  const handleToggleRole = async (userId, currentRoles, roleToToggle) => {
    let updatedRoles;
    if (currentRoles.includes(roleToToggle)) {
      updatedRoles = currentRoles.filter(r => r !== roleToToggle);
      if (updatedRoles.length === 0) updatedRoles = ['patient'];
    } else {
      updatedRoles = [...new Set([...currentRoles, roleToToggle])];
    }

    try {
      await api.patch(`/admin/users/${userId}/roles`, { 
        roles: updatedRoles,
        activeRole: updatedRoles.includes(roleToToggle) ? roleToToggle : updatedRoles[0]
      });
      refetchUsers();
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateAdminLevel = async (user, level) => {
    let updatedRoles = [...user.roles];
    if (level > 0) {
      if (!updatedRoles.includes('admin')) updatedRoles.push('admin');
    } else {
      updatedRoles = updatedRoles.filter(r => r !== 'admin');
      if (updatedRoles.length === 0) updatedRoles = ['patient'];
    }

    try {
      await api.patch(`/admin/users/${user._id}/roles`, { 
        adminLevel: level,
        roles: updatedRoles,
        activeRole: level > 0 ? 'admin' : updatedRoles[0]
      });
      refetchUsers();
    } catch (err) {
      alert('Failed to update governance level: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUniversalUnitGrant = async (user, unitRole) => {
    await handleToggleRole(user._id, user.roles, unitRole);
  };

  const { data: meData } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
  });

  const currentUser = meData?.user;

  const handleToggleStatus = async (userId, currentStatus) => {
    if (currentStatus === 'active') {
      const password = prompt("AUTHENTICATION REQUIRED: Enter your administrator password to confirm suspension.");
      if (!password) return;
      
      try {
        await api.patch(`/admin/users/${userId}/suspend`, { adminPassword: password });
        refetchUsers();
      } catch (err) {
        alert('Suspension failed: ' + (err.response?.data?.message || err.message));
      }
    } else {
      try {
        await api.patch(`/admin/users/${userId}/activate`);
        refetchUsers();
      } catch (err) {
        alert('Status update failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const [defaultPassword, setDefaultPassword] = useState('Welcome2RoboMed!');

  const handleMigration = async (e) => {
    e.preventDefault();
    if (!migrationFile) return;

    const formData = new FormData();
    formData.append('file', migrationFile);
    formData.append('defaultPassword', defaultPassword);

    setMigrationStatus('📡 Initiating Statutory Migration Stream...');
    try {
      const endpoint = `/ingestion/${migrationType}`;
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const stats = res.data.data.stats;
      setMigrationStatus({
        summary: `Migration Protocol Finalized: ${stats.successful} Successful, ${stats.failed} Failed / Skipped`,
        total: stats.total,
        timestamp: new Date().toLocaleString()
      });
      refetchUsers();
    } catch (err) {
      setMigrationStatus('❌ Migration Protocol Ruptured: ' + (err.response?.data?.message || 'Handshake Failure'));
    }
  };

  const handleDownloadMasterAudit = async () => {
    try {
      const response = await api.get('/admin/download-governance-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'RoboMed_Institutional_Audit.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Audit download failed:', err);
      alert('Unable to generate the system activity report.');
    }
  };

  const handleDownloadResearchVault = async () => {
    try {
      const response = await api.get('/admin/export-research-vault', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'RoboMed_Anonymized_Research_Vault.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Research export failed:', err);
      alert('Authority Clearance Error: Unable to extract the Anonymized Research Vault.');
    }
  };

  const handleUpdateOffice = async (userId, assignedOffice) => {
    try {
      await api.patch(`/admin/users/${userId}/office`, { assignedOffice });
      refetchUsers();
    } catch (err) {
      alert('Office delegation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const OFFICES = [
    'Chief Medical Office (CMO)',
    'Institutional Ethics Board',
    'Legal & Compliance Dept',
    'Pharmacy Oversight',
    'Laboratory Director',
    'Quality Assurance (QA)',
    'Technical Support / IT'
  ];

  const handleGenerateComplianceReport = async (userId) => {
    try {
      const res = await api.get(`/admin/compliance-report/${userId}`);
      setComplianceReport(res.data.data.report);
    } catch (err) {
      alert('Report Generation Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(val => 
        typeof val === 'object' ? JSON.stringify(val).replace(/,/g, ';') : String(val).replace(/,/g, ' ')
      ).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUsers = () => {
    const exportData = users.map(u => ({
      fullName: u.fullName,
      email: u.email,
      roles: u.roles.join('|'),
      status: u.status,
      hospitalId: u.hospitalId
    }));
    exportCSV(exportData, `Staff_Report_${Date.now()}`);
  };

  const handleExportLogs = () => {
    const exportData = logs.map(l => ({
      timestamp: new Date(l.createdAt).toLocaleString(),
      actor: l.actorId?.fullName,
      action: l.action,
      target: l.targetId?.fullName || 'System',
      metadata: JSON.stringify(l.metadata)
    }));
    exportCSV(exportData, `Audit_Logs_${Date.now()}`);
  };

  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/notifications').then(res => res.data.data.notifications)
  });

  const pinnedAlerts = notificationsData?.filter(n => n.isPinned && !n.isRead) || [];

  const handleDismissAlert = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      refetchNotifications();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-10 selection:bg-brand-500/30 text-gray-200">
      <div className="max-w-7xl mx-auto">
        
        {/* INSTITUTIONAL HIGH-URGENCY GATEWAY */}
            {pinnedAlerts.length > 0 && (
               <div className="mb-8 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 no-print">
                  <div className="flex items-center gap-4 mb-2">
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                     </span>
                     <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] italic">Critical System Alerts</h4>
                  </div>
                  {pinnedAlerts.map(alert => (
                     <div key={alert._id} className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] flex justify-between items-center group hover:bg-red-500/15 transition-all shadow-xl shadow-red-500/5">
                        <div className="flex items-start gap-6">
                           <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-xl">⚠️</div>
                           <div>
                              <h5 className="font-bold text-white uppercase text-xs tracking-tight mb-1">{alert.title}</h5>
                              <p className="text-red-400/80 text-[11px] italic font-medium">"{alert.message}"</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleDismissAlert(alert._id)}
                          className="px-6 py-2 bg-red-500 text-white text-[10px] font-black uppercase rounded-full hover:bg-white hover:text-black transition-all transform active:scale-95"
                        >
                          Acknowledge & Dismiss
                        </button>
                     </div>
                  ))}
               </div>
            )}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16 relative">
          <div className="flex items-center gap-6">
            <div className="w-32 h-16 flex items-center justify-center p-1">
               <img src="/oelod_logo_official.png" className="max-w-full max-h-full object-contain" alt="Oelod Official" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                 Management & Record Review ⚖️
              </h1>
              <p className="text-gray-500 mt-1">Management center for staff and patient records.</p>
            </div>
          </div>
          
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 no-print flex-wrap">
             {['Staff', 'patients', 'cases', 'reports', 'History', 'search', 'migration', 'Rules', 'Audit', ...(currentUser?.assignedOffice ? ['office'] : []), ...(currentUser?.adminLevel === 3 ? ['health', 'research'] : [])]
              .filter(t => {
                if (currentUser?.adminLevel === 1) {
                  return ['Staff', 'patients', 'search', 'office', 'reports'].includes(t);
                }
                return true;
              })
              .map((t) => (
               <button 
                 key={t}
                 onClick={() => {
                   if (t === 'reports') {
                     window.location.href = '/admin/reports';
                     return;
                   }
                   setActiveTab(t.toLowerCase());
                 }}
                 className={`px-6 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${activeTab === t.toLowerCase() ? 'bg-gray-800 text-white border border-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 {t === 'cases' ? 'Records' : t === 'Rules' ? 'Policies' : t === 'office' ? 'Department' : t === 'health' ? 'System Status' : t === 'Audit' ? 'Activity Log' : t === 'research' ? 'Data Vault' : t}
               </button>
             ))}
          </div>
        </div>

        {/* Stats Row - Admin/Super Admin Only */}
        {currentUser?.adminLevel > 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-top-4 duration-500 no-print">
             <AdminStatCard label="Total Records" value={statsData?.cases?.total?.[0]?.count || 0} icon="📝" />
             <AdminStatCard label="Review Quality" value={`${Math.round((statsData?.cases?.avgConfidence?.[0]?.avg || 0) * 100)}%`} icon="⚡" />
             <AdminStatCard label="Active Consultations" value={statsData?.cases?.byStatus?.find(s => s._id === 'open')?.count || 0} icon="🔓" />
             <AdminStatCard label="Completed Records" value={statsData?.cases?.byStatus?.find(s => s._id === 'closed')?.count || 0} icon="✅" />
          </div>
        )}

        {/* Search Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 no-print">
            <div className="card !p-4 sm:!p-5">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 sm:mb-3">Health Search</p>
               <SearchBar placeholder="Symptoms or Diseases..." />
            </div>
            <div className="card !p-4 sm:!p-5">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 sm:mb-3">Action History</p>
               <SearchBar placeholder="Patient ID or Case ID..." />
            </div>
            <div className="card !p-4 sm:!p-5 md:col-span-2 lg:col-span-1">
               <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 sm:mb-3">Health Search</p>
              <div className="relative">
                  <input 
                    type="text" 
                    className="input pr-10" 
                    placeholder="Search logs by staff or action..." 
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">🔍</span>
              </div>
           </div>
        </div>

        {/* Dynamic Table Zone */}
        <div className="card !p-0 overflow-visible border-gray-800">
           <div className="px-8 py-5 border-b border-gray-800 bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <h2 className="text-lg font-bold text-white capitalize">{activeTab} Monitor</h2>
              <div className="flex gap-3 no-print">
                 <button onClick={activeTab === 'staff' ? handleExportUsers : handleExportLogs} className="btn-secondary !py-2 !px-4 text-[10px] uppercase font-bold tracking-widest">⬇ Export CSV</button>
                 <button onClick={() => window.print()} className="btn-secondary !py-2 !px-4 text-[10px] uppercase font-bold tracking-widest">📄 Generate PDF</button>
              </div>
           </div>

           <div className="overflow-x-auto">
              {activeTab === 'staff' ? (
                <table className="w-full text-left">
                   <thead>
                     <tr className="bg-gray-800/30 text-gray-500 border-b border-gray-800">
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Practitioner</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hidden print:table-cell">Email</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hidden print:table-cell">Phone</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hidden print:table-cell">License</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] print:hidden">Contact & License</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Specialization</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right no-print-status">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/50">
                     {users.filter(u => u.roles.some(r => ['doctor', 'lab', 'pharmacist'].includes(r)) || u.adminLevel > 0).map(u => (
                       <tr key={u._id} className="hover:bg-gray-800/10 transition-colors group">
                         <td className="px-8 py-6">
                            <div className="flex flex-col">
                               <span className="font-bold text-white group-hover:text-brand-400 transition-colors uppercase italic">{u.fullName}</span>
                               <span className="text-xs text-brand-500 font-bold uppercase tracking-tighter">{u.roles.join(' / ')}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6 hidden print:table-cell text-xs font-mono">{u.email}</td>
                         <td className="px-8 py-6 hidden print:table-cell text-xs font-mono">{u.phoneNumber || 'N/A'}</td>
                         <td className="px-8 py-6 hidden print:table-cell text-xs font-mono font-bold">{u.licenseNumber || 'PENDING'}</td>
                         <td className="px-8 py-6 print:hidden">
                            <div className="flex flex-col gap-0.5">
                               <span className="text-xs text-gray-300 font-mono">{u.email}</span>
                               <span className="text-[10px] text-gray-500 font-bold">📞 {u.phoneNumber || 'NO_PHONE'}</span>
                               <span className="text-[10px] text-gray-500 font-bold">📜 LIC: {u.licenseNumber || 'PENDING'}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-1">
                              {u.specialization && u.specialization.length > 0 ? (
                                u.specialization.map(s => (
                                  <span key={s} className="px-2 py-0.5 bg-gray-800/50 border border-gray-800 text-[9px] font-black text-gray-400 uppercase rounded">{s}</span>
                                ))
                              ) : (
                                <span className="text-[9px] text-gray-600 italic">General Staff</span>
                              )}
                            </div>
                         </td>
                         <td className="px-8 py-6 text-right no-print-status">
                             <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-2">
                                   {u.adminLevel > 0 && (
                                     <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                       u.adminLevel === 3 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                                       u.adminLevel === 2 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 
                                       'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                     }`}>
                                       {u.adminLevel === 3 ? 'SUPER ADMIN' : u.adminLevel === 2 ? 'ADMIN' : 'MODERATOR'}
                                     </span>
                                   )}
                                   <span className={`text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>{u.status}</span>
                                   <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                </div>

                                <div className="flex flex-col gap-2 items-end opacity-0 group-hover:opacity-100 transition-all no-print">
                                  Management & Records Review ⚖️
                                  {currentUser?.adminLevel === 3 && (
                                    <div className="flex flex-col gap-2 p-3 bg-gray-900/50 border border-gray-800 rounded-xl mb-2">
                                       <span className="text-[8px] font-black text-gray-500 uppercase self-start">Governance Assignment (L3)</span>
                                       <select 
                                         className="bg-gray-950 border border-brand-500/20 text-[9px] font-black text-brand-400 uppercase tracking-tighter px-2 py-1.5 rounded outline-none w-48 focus:border-brand-500"
                                         value={u.assignedOffice || ''}
                                         onChange={(e) => handleUpdateOffice(u._id, e.target.value)}
                                       >
                                          <option value="">No Department Assigned</option>
                                          {OFFICES.map(off => (
                                            <option key={off} value={off}>{off}</option>
                                          ))}
                                       </select>
                                       <select 
                                         className="bg-gray-950 text-[9px] font-black uppercase text-brand-400 border border-brand-500/20 rounded px-2 py-1.5 outline-none w-48 focus:border-brand-500"
                                         value={u.adminLevel || 0}
                                         onChange={(e) => handleUpdateAdminLevel(u, parseInt(e.target.value))}
                                       >
                                         <option value="0" className="text-gray-500">Standard User</option>
                                         <option value="1">Moderator (Level 1)</option>
                                         <option value="2">Administrator (Level 2)</option>
                                         <option value="3">Authority (Level 3 - Super)</option>
                                      </select>
                                    </div>
                                  )}

                                  <div className="flex gap-2 flex-wrap justify-end">
                                    {currentUser?.adminLevel >= 2 && (
                                       <button 
                                         onClick={() => handleToggleStatus(u._id, u.status)}
                                         className={`px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all ${u.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'}`}
                                       >
                                         {u.status === 'active' ? 'Suspend Access' : 'Restore Access'}
                                       </button>
                                    )}
                                    <button onClick={() => handleUniversalUnitGrant(u, 'lab')} className={`px-2 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all ${u.roles.includes('lab') ? 'bg-white text-black border-white' : 'bg-gray-950 text-gray-500 border-gray-800 hover:text-white'}`}>{u.roles.includes('lab') ? 'Revoke Lab' : '+ Lab'}</button>
                                    <button onClick={() => handleUniversalUnitGrant(u, 'pharmacist')} className={`px-2 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all ${u.roles.includes('pharmacist') ? 'bg-white text-black border-white' : 'bg-gray-950 text-gray-500 border-gray-800 hover:text-white'}`}>{u.roles.includes('pharmacist') ? 'Revoke Pharm' : '+ Pharm'}</button>
                                  </div>
                                </div>
                             </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              ) : activeTab === 'patients' ? (
                <table className="w-full text-left">
                   <thead>
                     <tr className="bg-gray-800/30 text-gray-500 border-b border-gray-800">
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Patient Record</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Medical ID</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hidden print:table-cell">Email</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hidden print:table-cell">Phone</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right no-print-status">Access Privileges</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/50">
                     {users.filter(u => u.roles.includes('patient') && !u.roles.some(r => ['doctor', 'lab', 'pharmacist'].includes(r)) && (u.adminLevel || 0) === 0).map(u => (
                       <tr key={u._id} className="hover:bg-gray-800/10 transition-colors group">
                         <td className="px-8 py-6">
                            <div className="flex flex-col">
                               <span className="font-bold text-white group-hover:text-brand-400 transition-colors uppercase italic">{u.fullName}</span>
                               <span className="text-xs text-gray-500 mt-0.5 print:hidden">{u.email}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <span className="text-xs font-mono text-gray-400">{u.hospitalId || 'PENDING_GEN'}</span>
                         </td>
                         <td className="px-8 py-6 hidden print:table-cell text-xs font-mono">{u.email}</td>
                         <td className="px-8 py-6 hidden print:table-cell text-xs font-mono">{u.phoneNumber || 'N/A'}</td>
                         <td className="px-8 py-6 text-right no-print-status">
                            <div className="flex flex-col items-end gap-1">
                               <div className="flex items-center gap-2">
                                  {u.adminLevel > 0 && (
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                      u.adminLevel === 3 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                                      u.adminLevel === 2 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 
                                      'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                    }`}>
                                      {u.adminLevel === 3 ? 'SUPER ADMIN' : u.adminLevel === 2 ? 'ADMIN' : 'MODERATOR'}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>{u.status}</span>
                                  <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                               </div>
                               <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all no-print">
                                  {currentUser?.adminLevel >= 2 && (
                                    <button 
                                      onClick={() => handleToggleStatus(u._id, u.status)}
                                      className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase transition-all ${u.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'}`}
                                    >
                                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                                    </button>
                                  )}

                                  {currentUser?.adminLevel === 3 && (
                                     <div className="flex flex-col gap-1 items-end bg-gray-900/40 p-2 rounded-lg border border-gray-800">
                                        <select 
                                          className="bg-gray-950 text-[9px] font-black uppercase text-brand-400 border border-brand-500/20 rounded px-2 py-1 outline-none focus:border-brand-500 transition-all w-36"
                                          value={u.assignedOffice || ''}
                                          onChange={(e) => handleUpdateOffice(u._id, e.target.value)}
                                        >
                                           <option value="">No Office</option>
                                           {OFFICES.map(off => (
                                             <option key={off} value={off}>{off}</option>
                                           ))}
                                        </select>
                                        <select 
                                          className="bg-gray-950 text-[9px] font-black uppercase text-brand-400 border border-brand-500/20 rounded px-2 py-1 outline-none focus:border-brand-500 transition-all w-36"
                                          value={u.adminLevel || 0}
                                          onChange={(e) => handleUpdateAdminLevel(u, parseInt(e.target.value))}
                                        >
                                          <option value="0" className="text-gray-500">Standard User</option>
                                          <option value="1">Moderator (L1)</option>
                                          <option value="2">Admin (L2)</option>
                                          <option value="3">Super Admin (L3)</option>
                                        </select>
                                     </div>
                                  )}

                                  <button onClick={() => handleGenerateComplianceReport(u._id)} className="px-2 py-1 bg-brand-600 text-white border border-brand-500 rounded-lg text-[9px] font-black uppercase hover:bg-brand-500 transition-all tracking-widest shadow-lg shadow-brand-900/20 active:scale-95">📘 + COMPLIANCE</button>
                                  <button onClick={() => handleUniversalUnitGrant(u, 'lab')} className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase transition-all ${u.roles.includes('lab') ? 'bg-white text-black border-white' : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white'}`}>{u.roles.includes('lab') ? 'Revoke Lab' : '+ Lab'}</button>
                                  <button onClick={() => handleUniversalUnitGrant(u, 'pharmacist')} className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase transition-all ${u.roles.includes('pharmacist') ? 'bg-white text-black border-white' : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white'}`}>{u.roles.includes('pharmacist') ? 'Revoke Pharm' : '+ Pharm'}</button>
                               </div>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              ) : activeTab === 'cases' ? (
                 <div className="space-y-12 p-8">
                    {!allCasesData ? (
                       <div className="p-32 text-center">
                          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">📡 Securely connecting to medical records...</p>
                       </div>
                    ) : (
                    <>
                    {/* AI Assistant Chat Session */}
                    <div>
                       <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          Current Consultations
                       </h3>
                       <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-gray-800/50">
                                <tr>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Case ID</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Patient</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Specialty</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Status</th>
                                   <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {(allCasesData?.cases?.filter(c => c.status !== 'closed') || []).length === 0 ? (
                                   <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-600 italic text-sm">No active cases found in the system.</td></tr>
                                ) : (
                                   allCasesData.cases.filter(c => c.status !== 'closed').map(c => (
                                      <tr key={c._id} className="hover:bg-gray-900 transition-colors group">
                                         <td className="px-6 py-4 font-bold text-white text-sm">{c.caseCode}</td>
                                         <td className="px-6 py-4 text-xs text-gray-400">{c.patient?.fullName || 'N/A'}</td>
                                         <td className="px-6 py-4 text-[10px] font-black uppercase text-brand-400">{c.assignedSpecialty || 'General'}</td>
                                         <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                               <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border w-fit ${
                                                 c.status === 'resolved' ? 'bg-green-600/20 text-green-400 border-green-500/20 animate-pulse' :
                                                 c.status === 'flagged' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                 c.status === 'escalated' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                               }`}>
                                                 {c.status}
                                               </span>
                                               {c.residentClerkship && (
                                                  <span className="px-2 py-0.5 mt-1 text-[9px] font-black uppercase rounded bg-brand-500 text-black border border-brand-400 shadow-lg shadow-brand-900/40 w-fit">
                                                     Resident Prepared 📋
                                                  </span>
                                               )}
                                               {(c.status === 'flagged' || c.status === 'escalated' || c.status === 'resolved') && c.governanceNotes?.length > 0 && (
                                                 <span className="text-[9px] text-gray-500 italic truncate max-w-[150px]">
                                                   Reason: {c.governanceNotes[c.governanceNotes.length - 1].note}
                                                 </span>
                                               )}
                                            </div>
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                            <button 
                                              onClick={() => window.location.href=`/cases/${c._id}`}
                                              className="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors"
                                            >
                                              Review →
                                            </button>
                                         </td>
                                      </tr>
                                   ))
                                )}
                            </tbody>
                         </table>
                       </div>
                    </div>

                     {/* Governance Flag Intelligence Registry */}
                     <div className="space-y-6 pt-8 border-t border-gray-900 mt-12">
                         <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                            System Alerts & Management
                         </h3>
                         <div className="grid gap-4">
                            {(allCasesData?.cases?.filter(c => c.status === 'flagged' || c.status === 'escalated' || c.status === 'resolved') || []).length === 0 ? (
                               <div className="p-12 text-center bg-gray-950 border border-gray-800/50 rounded-[2rem]">
                                  <p className="text-gray-600 italic text-sm">No system alerts found.</p>
                               </div>
                            ) : (
                               allCasesData.cases.filter(c => c.status === 'flagged' || c.status === 'escalated' || c.status === 'resolved').map(c => (
                                  <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-red-500/30 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                     <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                           <span className="text-xs font-black text-white uppercase tracking-tighter">{c.caseCode}</span>
                                           <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                                              c.status === 'resolved' ? 'bg-green-600 text-white animate-pulse' : 
                                              c.status === 'escalated' ? 'bg-orange-500/10 text-orange-400' : 
                                              'bg-red-500/10 text-red-500'
                                           }`}>
                                              {c.status === 'resolved' ? 'Settled - Manual Re-assignment Required' : c.status}
                                           </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-300 italic">
                                           "{c.governanceNotes?.[c.governanceNotes.length - 1]?.note || 'No reason documented.'}"
                                        </p>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-3 tracking-widest">
                                           Final Settlement: {c.governanceNotes?.[c.governanceNotes.length - 1]?.office || 'Institutional'} · {new Date(c.governanceNotes?.[c.governanceNotes.length - 1]?.timestamp).toLocaleString()}
                                        </p>
                                     </div>
                                     <button 
                                       onClick={() => window.location.href=`/cases/${c._id}`}
                                       className={`btn-secondary !py-2 !px-6 text-[10px] font-black uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-all ${c.status === 'resolved' ? '!bg-brand-600 !text-white' : ''}`}
                                     >
                                       {c.status === 'resolved' ? 'Finalize Re-assign →' : 'Review →'}
                                     </button>
                                  </div>
                               ))
                            )}
                         </div>
                     </div>

                    {/* Closed Cases Table */}
                    <div>
                       <h3 className="text-sm font-black text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Resolved Records Archive
                       </h3>
                       <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden opacity-80">
                         <table className="w-full text-left">
                            <thead className="bg-gray-800/50">
                                <tr>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Case ID</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Patient</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Lead Doctor</th>
                                   <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-500">Closed Date</th>
                                   <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {(allCasesData?.cases?.filter(c => c.status === 'closed') || []).length === 0 ? (
                                   <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-600 italic text-sm">No records in historical archive.</td></tr>
                                ) : (
                                   allCasesData.cases.filter(c => c.status === 'closed').map(c => (
                                      <tr key={c._id} className="hover:bg-gray-900 transition-colors group">
                                         <td className="px-6 py-4 font-bold text-gray-400 text-sm">{c.caseCode}</td>
                                         <td className="px-6 py-4 text-xs text-gray-500">{c.patient?.fullName || 'N/A'}</td>
                                         <td className="px-6 py-4 text-xs text-gray-500">Dr. {c.doctor?.fullName || 'Root'}</td>
                                         <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-600 font-mono">{new Date(c.updatedAt).toLocaleDateString()}</td>
                                         <td className="px-6 py-4 text-right">
                                            <button 
                                              onClick={() => window.location.href=`/cases/${c._id}`}
                                              className="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors"
                                            >
                                              Review →
                                            </button>
                                         </td>
                                      </tr>
                                   ))
                                )}
                            </tbody>
                         </table>
                       </div>
                    </div>
                    </>
                    )}
                 </div>
              ) : activeTab === 'history' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-800/30 text-gray-500 border-b border-gray-800">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Timestamp</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Security Protocol</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Target</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Blob</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredLogs.map(log => (
                      <tr key={log._id} className="hover:bg-gray-800/10 transition-colors group">
                        <td className="px-8 py-6 text-xs text-gray-500 font-mono tracking-tighter">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex flex-col">
                               <span className="font-bold text-white uppercase tracking-tight italic group-hover:text-brand-400 transition-colors">{log.action.replace(/_/g, ' ')}</span>
                               <span className="text-[10px] text-gray-600 font-bold uppercase mt-0.5">Op: {log.actorId?.fullName || 'Root'}</span>
                            </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-semibold text-gray-400">{log.targetId?.fullName || 'System'}</td>
                        <td className="px-8 py-6 text-right font-mono text-[9px] text-gray-600 max-w-[200px] truncate ml-auto">
                           {JSON.stringify(log.metadata)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : activeTab === 'office' ? (
                  <div className="p-8 space-y-16 animate-in fade-in duration-500">
                     {/* BLOCK 1: FORMAL ESCALATIONS (Direct Action Required) */}
                     <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                           <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.3em]">Formal Escalations</h3>
                           <span className="text-[10px] text-gray-600 font-bold uppercase">{officeMattersData?.escalated?.length || 0} Pending Rulings</span>
                        </div>
                        <div className="grid gap-4">
                           {officeMattersData?.escalated?.length === 0 ? (
                              <div className="p-12 text-center bg-gray-900/20 rounded-3xl border border-gray-800 border-dashed">
                                 <p className="text-gray-600 italic text-xs">No direct escalations pending for ruling.</p>
                              </div>
                           ) : (
                              officeMattersData?.escalated?.map(c => (
                                 <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 hover:border-red-500/30 transition-all group flex justify-between items-center gap-6">
                                    <div className="flex-1">
                                       <div className="flex items-center gap-3 mb-2">
                                          <span className="text-xs font-black text-white uppercase">{c.caseCode}</span>
                                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest">Immediate Ruling Required</span>
                                       </div>
                                       <p className="text-sm text-gray-300 italic font-medium leading-tight">
                                          "{c.governanceNotes?.filter(n => n.action === 'escalated').pop()?.note || 'No reason provided.'}"
                                       </p>
                                    </div>
                                    <button onClick={() => window.location.href=`/cases/${c._id}`} className="btn-secondary !bg-white !text-black !px-8 py-3 text-[10px] font-black uppercase hover:!bg-red-500 hover:!text-white transition-all transform group-hover:-translate-y-1">Treat Matter →</button>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>

                     {/* BLOCK 2: CLINICAL OVERSIGHT (Universal Clinical Flags) */}
                     {currentUser?.assignedOffice === 'Chief Medical Office (CMO)' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center border-b border-gray-900 pb-4">
                              <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.3em]">Universal Clinical Oversight</h3>
                              <span className="text-[10px] text-gray-600 font-bold uppercase">{officeMattersData?.flagged?.length || 0} Active Clinical Flags</span>
                           </div>
                           <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity">
                              {officeMattersData?.flagged?.length === 0 ? (
                                 <div className="p-12 text-center bg-gray-900/20 rounded-3xl border border-gray-800 border-dashed">
                                    <p className="text-gray-600 italic text-xs">Clinical pipeline is currently clear of flags.</p>
                                 </div>
                              ) : (
                                 officeMattersData?.flagged?.map(c => (
                                    <div key={c._id} className="bg-gray-950 border border-gray-800/50 rounded-3xl p-6 hover:border-blue-500/30 transition-all group flex justify-between items-center gap-6">
                                       <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                             <span className="text-xs font-black text-gray-400 uppercase">{c.caseCode}</span>
                                             <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest">Clinical Alert</span>
                                             <span className="text-[10px] text-gray-600 font-bold ml-4">By: Dr. {c.doctor?.fullName || 'N/A'}</span>
                                          </div>
                                          <p className="text-sm text-gray-500 italic font-medium">
                                             "{c.governanceNotes?.filter(n => n.action === 'flagged').pop()?.note || 'Potential clinical oversight required.'}"
                                          </p>
                                       </div>
                                       <button onClick={() => window.location.href=`/cases/${c._id}`} className="px-6 py-2 border border-gray-800 text-[10px] font-black text-gray-500 uppercase rounded-xl hover:bg-white hover:text-black transition-all">Monitor →</button>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     )}
                  </div>
              ) : activeTab === 'migration' ? (
                  <div className="p-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                     <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-gray-900 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-xl border border-gray-800 mb-6">📥</div>
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Bulk Migration Engine</h2>
                        <p className="text-gray-500 font-medium">Bulk import old medical records into the new secure system.</p>
                     </div>

                     <div className="card !p-10 bg-gray-900 border-brand-500/10 shadow-2xl">
                        <form onSubmit={handleMigration} className="space-y-8">
                           <div className="grid grid-cols-2 gap-6">
                              <button 
                                type="button" 
                                onClick={() => setMigrationType('patients')}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${migrationType === 'patients' ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20' : 'bg-gray-950 text-gray-500 border-gray-800'}`}
                              >
                                Patient Registry Import
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setMigrationType('cases')}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${migrationType === 'cases' ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20' : 'bg-gray-950 text-gray-500 border-gray-800'}`}
                              >
                                Historical Case Import
                              </button>
                           </div>

                           {migrationType === 'patients' && (
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Set Institutional Default Password</label>
                                 <input 
                                   type="text" 
                                   className="input !bg-gray-950 !border-gray-800 text-brand-400 font-mono" 
                                   value={defaultPassword}
                                   onChange={(e) => setDefaultPassword(e.target.value)}
                                   placeholder="e.g. Welcome2RoboMed!"
                                 />
                                 <p className="text-[9px] text-gray-600 italic ml-4">Patients will be asked to change this during their first login.</p>
                              </div>
                           )}

                           <div className="p-12 border-2 border-dashed border-gray-800 rounded-[2.5rem] text-center group hover:border-brand-500/30 transition-all bg-gray-950/50">
                              <input type="file" className="hidden" id="mig-file" accept=".csv" onChange={(e) => setMigrationFile(e.target.files[0])} />
                              <label htmlFor="mig-file" className="cursor-pointer block">
                                 <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">📄</span>
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {migrationFile ? migrationFile.name : 'Select Institutional CSV Manifest'}
                                 </span>
                                 <p className="text-[9px] text-gray-600 mt-2">Maximum file size: 50MB</p>
                              </label>
                           </div>

                           <button 
                              type="submit" 
                              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-3xl transition-all shadow-xl shadow-brand-900/20 active:scale-95"
                              disabled={!migrationFile}
                           >
                              {typeof migrationStatus === 'string' && migrationStatus.includes('📡') ? "Streaming Data..." : "Execute Migration Protocol →"}
                           </button>

                           {migrationStatus && (
                              <div className="mt-8 p-6 bg-black/40 border border-brand-500/20 rounded-2xl">
                                 <pre className="text-[10px] text-brand-400 font-mono whitespace-pre-wrap">
                                    {typeof migrationStatus === 'string' ? migrationStatus : JSON.stringify(migrationStatus, null, 2)}
                                 </pre>
                              </div>
                           )}
                        </form>
                     </div>

                     <div className="mt-12 text-center text-gray-600">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Protocol Note: Ingestion is immutable once committed to clinical storage.</p>
                     </div>
                  </div>
              ) : activeTab === 'policies' ? (
                 <div className="p-10 max-w-6xl mx-auto space-y-16 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center">
                       <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Finalizing Your Summary</h2>
                       <p className="text-gray-500 font-medium">Platform-wide authority protocols and clinical chain of command.</p>
                       <div className="w-24 h-1 bg-brand-500 mx-auto mt-6 rounded-full shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.5)]"></div>
                    </div>

                    {/* Authority Flow Schematic */}
                    <div className="relative py-12">
                       <div className="absolute top-1/2 left-0 w-full h-px bg-gray-800 -translate-y-1/2 hidden lg:block"></div>
                       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                          {[
                            { label: 'PRACTITIONER', icon: '🩺', task: 'Clinical Triage', status: 'Base Access' },
                            { label: 'SUPERVISOR', icon: '👤', task: 'Incident Flagging', status: 'Level 1-2' },
                            { label: 'INSTITUTIONAL OFFICE', icon: '🛡️', task: 'Escalation Ruling', status: 'CMO / Ethics' },
                            { label: 'GOVERNANCE BOARD', icon: '⚖️', task: 'Final Settlement', status: 'Level 3 Authority' }
                          ].map((step, i) => (
                             <div key={i} className="bg-gray-950 border border-gray-800 p-6 rounded-3xl text-center group hover:border-brand-500/50 transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-gray-900 mx-auto mb-4 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">{step.icon}</div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{step.label}</h4>
                                <p className="text-xs text-brand-400 font-bold italic mb-3">{step.task}</p>
                                <span className="text-[9px] font-black text-gray-600 uppercase border border-gray-800 px-2 py-0.5 rounded">{step.status}</span>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Clinical Integrity Protocols */}
                        <div className="space-y-6">
                           <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] pl-4 border-l-4 border-brand-500">Clinical Protocols</h3>
                           <div className="space-y-4">
                              {[
                                { title: 'AI-Integrity Loop', text: 'All voice transcriptions and clinical triumvirates require the Institutional Heuristic model check.' },
                                { title: 'Migration Gateway', text: 'Bulk legacy ingestion is secondary to manual clinical verification. All imported pros start as PENDING.' },
                                { title: 'Audit Immortality', text: 'Institutional logs are blockchain-inspired and cannot be altered by L3 personnel.' }
                              ].map((p, i) => (
                                <div key={i} className="p-5 bg-gray-900/50 rounded-2xl border border-gray-800 hover:bg-gray-800/30 transition-colors">
                                   <h4 className="text-xs font-black text-gray-200 uppercase mb-2">{p.title}</h4>
                                   <p className="text-[11px] text-gray-500 leading-relaxed italic">"{p.text}"</p>
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* Active Authority Registry */}
                        <div className="space-y-6">
                           <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] pl-4 border-l-4 border-orange-500">Delegated Registry</h3>
                           <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-900">
                             <div className="p-4 bg-gray-900/50 text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Office Leads</div>
                             {users.filter(u => u.assignedOffice).length === 0 ? (
                               <div className="p-8 text-center text-xs text-gray-600 italic">No institutional leads currently delegated.</div>
                             ) : (
                               users.filter(u => u.assignedOffice).map(lead => (
                                 <div key={lead._id} className="p-4 flex justify-between items-center group">
                                    <div className="flex flex-col">
                                       <span className="text-xs font-bold text-white uppercase italic">{lead.fullName}</span>
                                       <span className="text-[9px] font-bold text-orange-500 tracking-tighter uppercase">{lead.assignedOffice}</span>
                                    </div>
                                    <div className="text-right">
                                       <span className="text-[8px] font-black p-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">DELEGATED Authority</span>
                                    </div>
                                 </div>
                               ))
                             )}
                           </div>
                        </div>
                    </div>

                    <div className="p-8 bg-black/40 border border-brand-500/20 rounded-[3rem] text-center">
                       <p className="text-xs text-gray-500 font-medium">OELOD RoboMed Institutional Operating System · v2.1.0-Release</p>
                    </div>
                 </div>
              ) : activeTab === 'audit' ? (
                  <div className="p-10 max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700 no-print">
                     <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-950 rounded-[2rem] mx-auto flex items-center justify-center text-3xl shadow-2xl border border-gray-800">🏛️</div>
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Institutional Auditor</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">This endpoint generates a formal legal settlement record for the Governance Board. It includes all ATR metrics and institutional audit trails.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="card !bg-gray-900 border-brand-500/10 p-8">
                           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                              <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
                              Protocol 01: Governance Health
                           </h3>
                           <p className="text-gray-400 text-[11px] italic leading-relaxed">Captures average resolution speed across all clinical departments including CMO, Ethics, and Pharmacy Oversight.</p>
                        </div>
                        <div className="card !bg-gray-900 border-brand-500/10 p-8">
                           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                              Protocol 02: Settlement Trail
                           </h3>
                           <p className="text-gray-400 text-[11px] italic leading-relaxed">Logs the exact clinical impact notes and resolving offices for all manual settlements over the last 90 days.</p>
                        </div>
                     </div>

                     <div className="p-12 bg-white/5 border border-white/10 rounded-[3rem] text-center space-y-8">
                        <div>
                           <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Ready for Archiving</p>
                           <h4 className="text-2xl font-black text-white italic">Generate Legal Audit Manifest</h4>
                        </div>
                        <button 
                           onClick={() => {
                              document.body.setAttribute('data-print-mode', 'board-report');
                              window.print();
                              document.body.removeAttribute('data-print-mode');
                           }} 
                           className="btn-primary !px-12 !py-5 text-xs uppercase font-black tracking-[0.2em] shadow-2xl shadow-brand-500/20 hover:scale-105 transition-all outline-none"
                        >
                           Print Board Report 📄
                        </button>
                     </div>
                  </div>
               ) : activeTab === 'health' ? (
                 <div className="p-10 space-y-12 animate-in fade-in duration-500">
                     <div className="flex justify-between items-center mb-12">
                        <div>
                           <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Institutional Governance Health</h2>
                           <p className="text-gray-500">Live operational metrics for departmental performance and institutional compliance.</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         {/* Block 1: Efficiency & Latency */}
                         <div className="card !bg-gray-900 border-brand-500/10 shadow-2xl shadow-black/50">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Governance Accountability</h3>
                            <div className="space-y-8">
                               <div>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 leading-none">Avg. Time-to-Resolution (ATR)</p>
                                  <p className="text-4xl font-black text-white italic tracking-tighter">
                                     {governanceHealthData?.health?.efficiencyMetrics?.[0]?.avgResolutionTime 
                                      ? (governanceHealthData.health.efficiencyMetrics[0].avgResolutionTime / (1000 * 60 * 60)).toFixed(1) + " Hrs"
                                      : "---"}
                                  </p>
                                  <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
                                     <div className="bg-brand-500 h-full shadow-[0_0_10px_#6ee7b7]" style={{ width: '65%' }}></div>
                                  </div>
                               </div>
                               <div className="pt-6 border-t border-gray-800">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 leading-none">Peak Clinical Latency</p>
                                  <p className="text-xl font-bold text-gray-400 tabular-nums">
                                     {governanceHealthData?.health?.efficiencyMetrics?.[0]?.maxResolutionTime 
                                      ? (governanceHealthData.health.efficiencyMetrics[0].maxResolutionTime / (1000 * 60 * 60)).toFixed(1) + " Hrs"
                                      : "---"}
                                  </p>
                               </div>
                            </div>
                         </div>

                         {/* Block 2: Specialty Flag Density */}
                         <div className="card col-span-2 shadow-2xl shadow-black/50">
                             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-800 pb-4">Specialty Flag Density</h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {governanceHealthData?.health?.specialtyFlags?.length === 0 ? (
                                   <p className="text-xs text-gray-600 italic">No clinical flags active.</p>
                                ) : (
                                   governanceHealthData?.health?.specialtyFlags?.map(flag => (
                                      <div key={flag._id} className="text-center group bg-gray-950 p-6 rounded-3xl border border-gray-900 hover:border-brand-500/30 transition-all">
                                         <div className="w-12 h-12 rounded-2xl bg-gray-900 mx-auto mb-3 flex items-center justify-center text-sm font-black text-brand-400 group-hover:bg-brand-500 group-hover:text-black transition-all">
                                            {flag.count}
                                         </div>
                                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{flag._id || 'General'}</p>
                                      </div>
                                   ))
                                )}
                             </div>
                         </div>
                     </div>
                 </div>
               ) : activeTab === 'research' ? (
                  <div className="p-10 max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700 no-print">
                      <div className="text-center space-y-4">
                         <div className="w-20 h-20 bg-gray-900 rounded-[2.5rem] mx-auto flex items-center justify-center text-3xl shadow-2xl border border-gray-800">🔬</div>
                         <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Anonymized Research Vault</h2>
                         <p className="text-gray-500 max-w-xl mx-auto">Accessing the institutional dataset for clinical evolution and AI training. All data is character-perfectly anonymized to protect patient sovereignty.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="card !bg-gray-900/50 border-brand-500/10 p-8 hover:border-brand-500/40 transition-all">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                               Dataset Integrity
                            </h3>
                            <p className="text-gray-400 text-[11px] leading-relaxed italic">"Every closed case is automatically ingested here. This dataset includes clinical symptoms, diagnostic outcomes, age, and gender metrics."</p>
                         </div>
                         <div className="card !bg-gray-900/50 border-brand-500/10 p-8 hover:border-brand-500/40 transition-all">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                               AI Training Resource
                            </h3>
                            <p className="text-gray-400 text-[11px] leading-relaxed italic">"This export is formatted for character-perfect compatibility with the Oelod Python-Science microservice for future model re-tuning."</p>
                         </div>
                      </div>

                      <div className="p-16 bg-brand-500/5 border border-brand-500/20 rounded-[4rem] text-center space-y-10 group shadow-[0_0_50px_rgba(var(--brand-500-rgb),0.05)]">
                         <div className="space-y-2">
                            <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.4em]">Level 3 Authority Only</p>
                            <h4 className="text-3xl font-black text-white italic">Execute Statutory Research Export</h4>
                         </div>
                         <button 
                            onClick={handleDownloadResearchVault} 
                            className="bg-brand-600 hover:bg-brand-500 text-white !px-16 !py-6 text-[11px] uppercase font-black tracking-[0.3em] rounded-full shadow-2xl shadow-brand-500/40 transition-all hover:scale-105 active:scale-95 group-hover:shadow-brand-500/60"
                         >
                            Download Research Manifest (CSV) 📥
                         </button>
                         <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Protocol: All extractions are logged to the Master Audit Trail.</p>
                      </div>
                  </div>
                ) : (
                <div className="p-32 text-center opacity-30 select-none">
                   <div className="text-6xl mb-6">🔍</div>
                   <p className="text-lg font-black text-white italic uppercase tracking-tighter">Enter criteria to begin Discovery</p>
                </div>
              )}
           </div>
        </div>

        {/* ── STATUTORY COMPLIANCE MODAL ────────────────────────────────────── */}
        {complianceReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setComplianceReport(null)}></div>
             <div className="relative w-full max-w-4xl bg-gray-950 border border-brand-500/30 rounded-[3rem] shadow-[0_0_100px_rgba(var(--brand-500-rgb),0.1)] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-900 bg-gray-900/50 flex justify-between items-center">
                   <div>
                      <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-1">Institutional Compliance Manifest</h4>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Statutory Audit: {complianceReport.patient.fullName}</h3>
                   </div>
                   <button onClick={() => setComplianceReport(null)} className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                   {/* Summary Section */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-gray-900/50 rounded-3xl border border-gray-800">
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Subject PID</p>
                         <p className="text-lg font-bold text-white font-mono">{complianceReport.patient.hospitalId}</p>
                      </div>
                      <div className="p-6 bg-gray-900/50 rounded-3xl border border-gray-800">
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Event Density</p>
                         <p className="text-lg font-bold text-white font-mono">{complianceReport.auditTrail.length} Logs</p>
                      </div>
                      <div className="p-6 bg-gray-900/50 rounded-3xl border border-gray-800">
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Manifest Age</p>
                         <p className="text-lg font-bold text-white font-mono">{new Date(complianceReport.generatedAt).toLocaleDateString()}</p>
                      </div>
                   </div>

                   {/* Audit Trail List */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-4 border-l-2 border-brand-500">Forensic Audit Trail</h5>
                      <div className="space-y-3">
                         {complianceReport.auditTrail.map((log, i) => (
                           <div key={i} className="p-5 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 group hover:border-brand-500/20 transition-all">
                              <div>
                                 <p className="text-[10px] font-mono text-gray-600 mb-1">{new Date(log.createdAt).toLocaleString()} · {log.action.toUpperCase()}</p>
                                 <p className="text-sm font-medium text-gray-200 uppercase italic">
                                    Operator: <span className="text-brand-400 font-bold">{log.actorId?.fullName || 'Root Authority'}</span>
                                 </p>
                                 <p className="text-[11px] text-gray-500 mt-2 font-mono truncate max-w-sm">{JSON.stringify(log.metadata)}</p>
                              </div>
                              <div className="flex items-center">
                                 <span className="px-3 py-1 bg-gray-950 text-gray-500 text-[10px] font-black rounded-lg border border-gray-800/50">SEALED</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 border-t border-gray-900 bg-gray-950 flex justify-end gap-4">
                   <button onClick={() => window.print()} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase rounded-2xl hover:bg-brand-500 transition-all shadow-xl">📄 Export Manifest</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
