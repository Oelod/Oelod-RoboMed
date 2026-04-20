import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import NotificationDrawer from '../NotificationDrawer';
import ProfileSettingsModal from '../ProfileSettingsModal';

export default function TopBar({ onMenuClick }) {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="h-20 glass border-b border-white/5 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Mobile Toggle & Brand Node */}
      <div className="flex items-center gap-4 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
        >
          <span className="text-xl">☰</span>
        </button>
        <div className="flex flex-col">
          <span className="text-white font-black text-sm italic uppercase leading-none">OELOD</span>
          <span className="text-brand-500 font-bold text-[8px] uppercase tracking-[0.2em]">RoboMed</span>
        </div>
      </div>

      {/* Search / Context Field (Desktop Focus) */}
      <div className="flex-1 max-w-xl hidden md:block">
         <div className="relative group">
            <input 
              type="text" 
              placeholder="Search patient directory..." 
              className="w-full bg-white/5 border border-white/5 rounded-xl px-12 py-2.5 text-sm text-white placeholder-gray-500 focus:bg-white/10 focus:border-brand-500/50 outline-none transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 grayscale opacity-50 group-focus-within:grayscale-0 group-focus-within:opacity-100 transition-all">🔍</span>
         </div>
      </div>

      {/* Identity & Actions Hub */}
      <div className="flex items-center gap-8">
        {/* Role Switcher */}
        {user?.roles && user.roles.length > 1 && (
           <div className="hidden xl:flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Switch Role:</span>
              <select 
                value={user.activeRole} 
                onChange={(e) => switchRole(e.target.value)}
                className="bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest rounded-lg px-4 py-2 outline-none cursor-pointer hover:bg-brand-500/20 transition-all"
              >
                {user.roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
           </div>
        )}

        <div className="flex items-center gap-6">
          <NotificationDrawer />
          
          {/* User Manifold */}
          <div className="flex items-center gap-4 border-l border-white/5 pl-8">
            <div className="text-right hidden sm:flex flex-col">
              <span className="text-white font-black text-sm italic uppercase tracking-tighter leading-none">{user?.fullName}</span>
              <span className="text-brand-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{user?.activeRole}</span>
            </div>
            
            <div className="relative group">
               <div 
                 onClick={() => setIsProfileOpen(true)}
                 className="w-11 h-11 rounded-2xl bg-gray-900 border border-white/10 overflow-hidden cursor-pointer hover:border-brand-500 transition-all shadow-2xl relative"
               >
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.fullName} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-500/20 text-brand-400 font-black text-lg italic">
                      {user?.fullName?.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-brand-500/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                     <span className="text-[9px] font-black text-white uppercase tracking-tighter">Edit</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <ProfileSettingsModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </header>
  );
}
