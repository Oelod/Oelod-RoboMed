import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import SearchBar from '../components/SearchBar';

const FilterBadge = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${active ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
  >
    {label}
  </button>
);

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStr = searchParams.get('q') || '';
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    specialty: searchParams.get('specialty') || ''
  });

  const updateFilters = (key, value) => {
    const newFilters = { ...filters, [key]: value === filters[key] ? '' : value };
    setFilters(newFilters);
    
    const newParams = new URLSearchParams(searchParams);
    if (newFilters[key]) {
      newParams.set(key, newFilters[key]);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['search', queryStr, filters],
    queryFn: () => {
      const params = new URLSearchParams({ q: queryStr, ...filters });
      return api.get(`/search?${params.toString()}`).then(r => r.data.data);
    },
    enabled: !!queryStr,
  });

  const caseResults = data?.results?.cases || [];
  const userResults = data?.results?.users || [];

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
          <div className="max-w-xl">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Record Search</h1>
            <p className="text-gray-500 text-sm italic">Search medical history and clinical records across the platform.</p>
          </div>
          <div className="w-full md:w-96">
            <SearchBar placeholder="Symptoms, IDs, or Practitioner Names..." />
          </div>
        </div>

        {/* Filter Matrix */}
        <div className="flex flex-wrap gap-10 mb-12 pb-12 border-b border-gray-900">
           <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Status</p>
              <div className="flex gap-2">
                 {['open', 'assigned', 'closed', 'flagged'].map(s => (
                   <FilterBadge key={s} label={s} active={filters.status === s} onClick={() => updateFilters('status', s)} />
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Priority</p>
              <div className="flex gap-2">
                 {['low', 'medium', 'high', 'critical'].map(p => (
                   <FilterBadge key={p} label={p} active={filters.priority === p} onClick={() => updateFilters('priority', p)} />
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Primary Specialty</p>
              <div className="flex gap-2">
                 {['Cardiology', 'Neurology', 'Oncology', 'Dermatology'].map(sp => (
                   <FilterBadge key={sp} label={sp} active={filters.specialty === sp} onClick={() => updateFilters('specialty', sp)} />
                 ))}
              </div>
           </div>
        </div>

        {/* Results Stream */}
        <div className="space-y-12">
          {!queryStr ? (
            <div className="py-32 text-center opacity-30 select-none">
               <div className="text-6xl mb-6">👁️‍🗨️</div>
               <p className="text-lg font-black text-white italic uppercase tracking-tighter">Enter criteria to begin searching</p>
            </div>
          ) : (caseResults.length === 0 && userResults.length === 0 && !isLoading) ? (
            <div className="py-32 text-center bg-gray-900/20 border border-gray-800/50 rounded-[3rem]">
               <div className="text-4xl mb-4">🏜️</div>
               <p className="text-gray-500 italic font-medium">No records found matching your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {/* --- Sector 1: Identified Profiles --- */}
               {userResults.length > 0 && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">
                       Staff & Patient Profiles ({userResults.length})
                    </h2>
                    <div className="h-px bg-orange-500/20 flex-1 ml-6"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {userResults.map(u => (
                      <div key={u._id} className="card !bg-gray-900/50 border-orange-500/10 flex items-center gap-4 group hover:border-orange-500/30 transition-all cursor-default overflow-hidden">
                        <div className="w-12 h-12 bg-gray-800 rounded-full overflow-hidden border border-gray-700 ring-2 ring-orange-500/10">
                           {u.profilePicture ? (
                             <img src={u.profilePicture} className="w-full h-full object-cover" alt="" />
                           ) : (
                             <span className="w-full h-full flex items-center justify-center text-xs font-black text-gray-600 bg-gray-900">{u.fullName.charAt(0)}</span>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="text-xs font-black text-white uppercase italic truncate">{u.fullName}</h4>
                           <p className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">{u.hospitalId} · {u.roles.join(' / ')}</p>
                           {u.specialization?.length > 0 && <p className="text-[8px] text-gray-500 font-medium truncate italic mt-1">{u.specialization.join(', ')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

               {/* --- Sector 2: Clinical Records --- */}
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-black text-brand-400 uppercase tracking-[0.3em]">
                    {isLoading ? 'Searching...' : `Clinical Records Found (${caseResults.length})`}
                  </h2>
                  <div className="h-px bg-gray-900 flex-1 ml-6"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {caseResults.map((c) => (
                    <div 
                      key={c._id}
                      onClick={() => navigate(`/cases/${c._id}`)}
                      className="card group hover:scale-[1.02] transition-all cursor-pointer border border-gray-800/50 flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-950"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Case ID</span>
                           <h3 className="text-white font-black italic tracking-tighter text-lg group-hover:text-brand-400 transition-colors uppercase">{c.caseCode}</h3>
                        </div>
                        <span className={`text-[9px] px-2 py-1 rounded-lg border font-black uppercase tracking-widest ${
                           c.status === 'closed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                           c.status === 'flagged' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                           'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {c.symptoms.slice(0, 4).map((s, i) => (
                          <span key={i} className="text-[9px] px-2 py-1 bg-gray-950 text-gray-500 border border-gray-800 rounded-md font-bold uppercase tracking-tighter">{s}</span>
                        ))}
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-3 italic font-medium mb-auto">"{c.description || 'No institutional description provided.'}"</p>

                      <div className="mt-8 pt-6 border-t border-gray-800/50 flex flex-col gap-4">
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden ring-1 ring-gray-700">
                                 {c.patient?.profilePicture ? (
                                   <img src={c.patient.profilePicture} className="w-full h-full object-cover" alt="" />
                                 ) : (
                                   <span className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 font-black uppercase">{c.patient?.fullName?.charAt(0)}</span>
                                 )}
                               </div>
                               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight truncate max-w-[100px]">{c.patient?.fullName}</span>
                            </div>
                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">{new Date(c.createdAt).toLocaleDateString()}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
