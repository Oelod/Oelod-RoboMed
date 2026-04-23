import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Statutory Identity Restoration Overlay
 * Formally guides clinical participants through the identity restoration handshake.
 */
export default function RestorationOverlay() {
  const { requiresRestoration, handleIdentityRestoration, handleIdentityReset, logout } = useAuth();
  const [phrase, setPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');

  if (!requiresRestoration) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phrase) return;
    setIsRestoring(true);
    setError('');
    try {
      await handleIdentityRestoration(phrase);
    } catch (err) {
      setError('Verification Failed: The phrase entered does not match your registered security key.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("WARNING: Resetting your identity will allow you to log in with the new default phrase, but you will lose access to any old encrypted records. Continue?")) return;
    setIsResetting(true);
    try {
      await handleIdentityReset();
    } catch (err) {
      setError('System Error: Unable to reset identity manifold.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="relative w-full max-w-xl bg-gray-950 border border-brand-500/30 rounded-[3rem] shadow-[0_0_100px_rgba(var(--brand-500-rgb),0.1)] overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-900 overflow-hidden">
          <div className={`h-full bg-brand-500 transition-all duration-1000 ${isRestoring ? 'w-full animate-pulse' : 'w-1/4'}`}></div>
        </div>

        <div className="p-10 sm:p-14 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-gray-800 mx-auto mb-8 flex items-center justify-center text-4xl shadow-inner animate-bounce duration-3000">
            🔐
          </div>
          
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-tight">
            Secure Access <br/> Required
          </h2>
          
          <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed mb-10 italic">
            "Your account is secured with a private phrase. To access your medical records on this browser, please enter it below."
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 rounded-xl bg-brand-900/10 border border-brand-500/20 text-[10px] font-bold text-brand-400 uppercase tracking-widest italic">
               Current Default Phrase: <span className="text-white font-black ml-2">RoboMed-Secure-2026</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input 
                type="password" 
                placeholder="Enter Security Phrase..." 
                className="input !py-5 pr-14 text-center placeholder:text-gray-700 font-mono tracking-widest"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                disabled={isRestoring}
                autoFocus
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🛡️</div>
            </div>

            {error && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
                  🚨 {error}
                </div>
                <button 
                   type="button"
                   onClick={handleReset}
                   disabled={isResetting}
                   className="w-full p-4 rounded-xl bg-gray-900 border border-gray-800 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all"
                >
                   {isResetting ? 'Resetting...' : 'Reset My Identity & Start Fresh'}
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full !py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand-500/20 active:scale-95 transition-all"
              disabled={isRestoring || !phrase}
            >
              {isRestoring ? 'Verifying...' : 'Verify & Access Records →'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-900">
            <button 
              onClick={logout}
              className="text-gray-600 hover:text-gray-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel & Terminate Session
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-900/50 text-center text-[8px] font-black text-gray-700 uppercase tracking-widest border-t border-gray-900">
          Institutional Security Manifold · v2.1.0-Release · Handshake ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
