import { useState } from 'react';
import SideNav from './SideNav';
import TopBar from './TopBar';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Side Navigation Manifold */}
      <SideNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      {/* Main Content Hub */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto scrollbar-hide relative">
           {/* Internal Background Micro-Animations */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none"></div>

           <div className="max-w-[1600px] mx-auto w-full animate-slide-in">
              <Outlet />
           </div>
        </main>
      </div>

      {/* Mobile Trigger Hub (Visible only on small screens) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-2xl shadow-brand-500/40 flex items-center justify-center text-2xl active:scale-90 transition-all border border-white/20"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
         <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-80 sidebar-gradient border-r border-white/10 animate-in slide-in-from-left duration-300">
               <SideNav />
            </div>
         </div>
      )}
    </div>
  );
}
