import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo.png';

export default function SideNav({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Role-based Navigation Config
  const navItems = [
    { label: 'Medical Dashboard', path: '/dashboard', icon: '💎', roles: ['patient', 'doctor', 'admin', 'lab', 'pharmacist'] },
    { label: 'Patient Directory', path: '/search', icon: '👤', roles: ['doctor', 'admin'] },
    { label: 'Open Medical Case', path: '/cases/new', icon: '➕', roles: ['patient'] },
    { label: 'Laboratory', path: '/lab', icon: '🔬', roles: ['lab', 'admin'] },
    { label: 'Pharmacy', path: '/pharmacy', icon: '💊', roles: ['pharmacist', 'admin'] },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: '📊', roles: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.activeRole));

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-72 h-screen sidebar-gradient border-r border-white/5 flex flex-col z-[70] transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:block
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo & Controls */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gray-900 border border-brand-500/30 flex items-center justify-center p-2 shadow-2xl shadow-brand-500/10">
              <img src={logo} alt="RoboMed" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg italic tracking-tighter uppercase leading-none">OELOD</span>
              <span className="text-brand-500 font-bold text-[9px] uppercase tracking-[0.2em] opacity-80">RoboMed</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-gray-500 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          {filteredItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`nav-item group ${isActive(item.path) ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className="text-lg grayscale-0">{item.icon}</span>
              <span>{item.label}</span>
              {isActive(item.path) && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Controls */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <button 
             onClick={logout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 group"
          >
            <span className="text-xl group-hover:rotate-12 transition-transform">⏻</span>
            <span>Sign Out</span>
          </button>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">System Status: Online</span>
              </div>
              <p className="text-[9px] text-gray-600 font-medium uppercase tracking-tighter leading-relaxed">
                Patient Records Synchronized. Secure Data Transmission Active.
              </p>
          </div>
        </div>
      </aside>
    </>
  );
}
