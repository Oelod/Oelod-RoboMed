import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import NotificationDrawer from './NotificationDrawer';
import ProfileSettingsModal from './ProfileSettingsModal';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="w-full bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-[100] shadow-2xl no-print sticky top-0">
      <div className="flex items-center gap-4">
        {/* LOGO & BRAND */}
        <div className="cursor-pointer group flex items-center gap-3 sm:gap-4" onClick={() => navigate('/dashboard')}>
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-brand-500 transition-all">
              <img src={logo} className="w-full h-full object-contain p-1 sm:p-1.5" alt="OELOD RoboMed" />
           </div>
           <div className="flex flex-col">
              <span className="text-white font-black text-lg sm:text-xl tracking-tight uppercase italic leading-none">OELOD</span>
              <span className="text-brand-500 font-bold text-[8px] sm:text-[10px] uppercase tracking-widest opacity-80">RoboMed System</span>
           </div>
        </div>
      </div>

      {/* DESKTOP ACTIONS */}
      <div className="hidden lg:flex items-center gap-6">
        <NotificationDrawer />
        
        {user.roles && user.roles.length > 1 && (
          <select 
            value={user.activeRole} 
            onChange={(e) => switchRole(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-brand-300 text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-800 transition-all"
          >
            {user.roles.map(r => (
              <option key={r} value={r}>View as {r}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-4 border-l border-gray-800 pl-6">
          <div className="text-right hidden sm:flex flex-col justify-center">
            <span className="text-white font-bold text-sm leading-tight italic uppercase tracking-tighter">{user.fullName}</span>
            <span className="text-brand-400 text-[9px] font-black uppercase tracking-widest opacity-80">{user.activeRole}</span>
          </div>
          
          <div className="relative group">
             <div 
               onClick={() => setIsProfileOpen(true)}
               className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 overflow-hidden cursor-pointer hover:border-brand-500 transition-all shadow-inner"
             >
                {user.profilePicture ? (
                  <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.fullName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-900/20 text-brand-400 font-black text-sm uppercase italic">
                    {user.fullName.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter">Edit</span>
                </div>
             </div>
          </div>

          <button 
            onClick={handleLogout}
            className="ml-2 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* MOBILE TRIGGER & MOBILE-ONLY NOTIFS */}
      <div className="flex lg:hidden items-center gap-4">
         <NotificationDrawer />
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-white"
         >
           {isMobileMenuOpen ? '✕' : '☰'}
         </button>
      </div>

      {/* MOBILE OVERLAY MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[64px] bg-gray-950 z-[99] lg:hidden p-8 animate-in fade-in slide-in-from-right duration-300 overflow-y-auto">
           <div className="flex flex-col gap-10">
              {/* Profile Brief */}
              <div className="flex items-center gap-6 p-6 bg-gray-900/50 border border-gray-800 rounded-[2rem]">
                 <div className="w-16 h-16 rounded-full border-2 border-brand-500 p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} className="w-full h-full object-cover" alt={user.fullName} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-brand-400">{user.fullName.charAt(0)}</div>
                      )}
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-white font-black text-xl italic uppercase tracking-tighter">{user.fullName}</span>
                    <span className="text-brand-500 text-xs font-bold uppercase tracking-widest">{user.activeRole}</span>
                    <button onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }} className="text-gray-500 text-[10px] font-black uppercase text-left mt-2 hover:text-white">Adjust Settings â†’</button>
                    <button onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }} className="text-gray-500 text-[10px] font-black uppercase text-left mt-2 hover:text-white">Adjust Settings →</button>
                 </div>
              </div>

              {/* Matrix Switcher */}
              {user.roles && user.roles.length > 1 && (
                <div className="space-y-4">
                   <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] px-2">Switch Views</p>
                   <div className="grid grid-cols-1 gap-2">
                     {user.roles.map(r => (
                       <button 
                         key={r} 
                         onClick={() => { switchRole(r); setIsMobileMenuOpen(false); }}
                         className={`w-full p-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${user.activeRole === r ? 'bg-brand-500 border-brand-500 text-black' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
                       >
                         Switch to: {r}
                       </button>
                     ))}
                   </div>
                </div>
              )}

              {/* Institutional Terminal Shutdown */}
              <button 
                onClick={handleLogout}
                className="w-full p-6 bg-red-500 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-black hover:text-red-500 border-2 border-red-500 transition-all shadow-xl shadow-red-500/20"
              >
                Logout
              </button>
           </div>
        </div>
      )}

      <ProfileSettingsModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </nav>
  );
}
