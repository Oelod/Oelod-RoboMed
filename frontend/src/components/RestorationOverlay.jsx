import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Statutory Identity Restoration Overlay
 * Formally guides clinical participants through the identity restoration handshake.
 */
export default function RestorationOverlay() {
  const { requiresRestoration, handleIdentityRestoration, logout } = useAuth();
  const [phrase, setPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
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
      setError('Handshake Failed: Recovery phrase might be incorrect or corrupted.');
    } finally {
      setIsRestoring(false);
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
            Institutional Identity <br/> Restoration Required
          </h2>
          
          <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed mb-10 italic">
            "Your cryptographic identity is character-perfectly secured on the Registry, but requires local restoration on this terminal."
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input 
                type="password" 
                placeholder="Enter Statutory Recovery Phrase..." 
                className="input !py-5 pr-14 text-center placeholder:text-gray-700 font-mono tracking-widest"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                disabled={isRestoring}
                autoFocus
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🛡️</div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
                🚨 {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full !py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand-500/20 active:scale-95 transition-all"
              disabled={isRestoring || !phrase}
            >
              {isRestoring ? 'Processing Recovery Handshake…' : 'Restore Clinical Identity →'}
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
