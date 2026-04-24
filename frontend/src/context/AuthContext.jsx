import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axiosInstance';
import * as cryptoService from '../services/cryptoService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);  // kept in memory — NOT localStorage
  const [loading, setLoading] = useState(true);
  const [requiresRestoration, setRequiresRestoration] = useState(false);
  
  const DEFAULT_RECOVERY_PHRASE = "RoboMed-Secure-2026";

  // Attach token to all future requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // On mount: try silent refresh using httpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;
    const silentRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
        if (isMounted) {
          setToken(res.data.data.token);
          setUser(res.data.data.user);
        }
      } catch (err) {
        console.warn('Institutional Session: No active clinical context found.', err.message);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    silentRefresh();
    return () => { isMounted = false; };
  }, []);

  // --- Institutional E2EE Handshake ---
  const initE2EE = useCallback(async (targetUser) => {
    if (!targetUser) return;

    const priv = await cryptoService.getPrivateKey(targetUser._id);
    
    // If we have a public key on server BUT NO local private key, we need restoration.
    if (targetUser.publicKey && !priv) {
       setRequiresRestoration(true);
       return; 
    }

    // If we have both, we are secured.
    if (targetUser.publicKey && priv) {
       setRequiresRestoration(false);
       return;
    }

    try {
      const keyPair = await cryptoService.generateKeyPair();
      await cryptoService.savePrivateKey(targetUser._id, keyPair);
      const pubKeyStr = await cryptoService.exportPublicKey(keyPair.publicKey);
      
      await api.patch('/auth/public-key', { publicKey: pubKeyStr });
      
      // Industrial Auto-Escrow: Secure with default phrase during Phase 7 testing
      try {
        await cryptoService.backupIdentity(targetUser._id, DEFAULT_RECOVERY_PHRASE);
      } catch (e) { console.warn("Auto-Escrow Failed"); }

      setUser(prev => ({ ...prev, publicKey: pubKeyStr }));
      setRequiresRestoration(false);
    } catch (err) {
      // E2EE Initialization Failure handled silently in production
    }
  }, []);

  const handleIdentityRestoration = async (phrase) => {
    try {
       await cryptoService.restoreIdentity(user._id, phrase);
       setRequiresRestoration(false);
       return true;
    } catch (err) {
       throw err;
    }
  };

  const handleIdentityReset = async () => {
    try {
       await api.delete('/auth/identity/reset');
       setRequiresRestoration(false);
       // Re-trigger E2EE initialization to generate a new character-perfect keypair
       await initE2EE(user);
       return true;
    } catch (err) {
       throw err;
    }
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (user && token && !loading && !hasInitialized.current) {
       hasInitialized.current = true;
       initE2EE(user);
    }
    if (!user) {
       hasInitialized.current = false;
    }
  }, [user?._id, token, loading, initE2EE]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password }, { withCredentials: true });
    const { token: newToken, user: newUser } = res.data.data;
    
    // Industrial Force-Sync: Attach header immediately to seal the handshake
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload, { withCredentials: true });
    const { token: newToken, user: newUser } = res.data.data;

    // Industrial Force-Sync: Attach header immediately 
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}, { withCredentials: true }); } catch { /* ignore */ }
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const switchRole = useCallback(async (role) => {
    await api.patch('/dashboard/switch-role', { role });
    // After DB processes activeRole shift, explicitly pull a fresh JWT down to the client instance
    const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
    const { token: newToken, user: newUser } = res.data.data;
    
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
      const { token: newToken, user: newUser } = res.data.data;
      
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(newUser);
    } catch (e) { /* silent fail */ }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, requiresRestoration,
      login, register, logout, switchRole, refreshUser, handleIdentityRestoration, handleIdentityReset 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
