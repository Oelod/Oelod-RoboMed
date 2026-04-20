import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo.png';

export default function SideNav() {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Role-based Navigation Config
  const navItems = [
    { label: 'Platform Hub', path: '/dashboard', icon: '💎', roles: ['patient', 'doctor', 'admin', 'lab', 'pharmacist'] },
    { label: 'Patient Registry', path: '/search', icon: '👤', roles: ['doctor', 'admin'] },
    { label: 'Create Case', path: '/cases/new', icon: '➕', roles: ['patient'] },
    { label: 'Diagnostic Lab', path: '/lab', icon: '🔬', roles: ['lab', 'admin'] },
    { label: 'Pharmacy Unit', path: '/pharmacy', icon: '💊', roles: ['pharmacist', 'admin'] },
    { label: 'Institutional Reports', path: '/admin/reports', icon: '📊', roles: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.activeRole));

  return (
    <aside className="w-72 h-screen flex flex-col border-r border-white/5 sidebar-gradient sticky top-0 hidden lg:flex">
      {/* Brand Inception */}
      <div className="p-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-brand-500/30 flex items-center justify-center p-2 shadow-2xl shadow-brand-500/10">
          <img src={logo} alt="RoboMed" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-black text-xl italic tracking-tighter uppercase leading-none">OELOD</span>
          <span className="text-brand-500 font-bold text-[10px] uppercase tracking-[0.3em] opacity-80">RoboMed</span>
        </div>
      </div>

      {/* Nav Stream */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            className={`nav-item group ${isActive(item.path) ? 'nav-item-active' : 'nav-item-inactive'}`}
          >
            <span className="text-lg grayscale-0">{item.icon}</span>
            <span>{item.label}</span>
            {isActive(item.path) && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-full shadow-[0_0_15px_rgba(var(--brand-500),0.5)]"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* Institutional Footer */}
      <div className="p-6 border-t border-white/5">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Registry Status: Live</span>
            </div>
            <p className="text-[9px] text-gray-600 font-medium uppercase tracking-tighter leading-relaxed">
              Institutional Nodes Synchronized. PHI Transmission Encrypted.
            </p>
        </div>
      </div>
    </aside>
  );
}
