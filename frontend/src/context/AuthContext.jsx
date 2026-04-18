import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';
import * as cryptoService from '../services/cryptoService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);  // kept in memory — NOT localStorage
  const [loading, setLoading] = useState(true);

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
    const silentRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
        setToken(res.data.data.token);
        setUser(res.data.data.user);
      } catch {
        // No valid session — user stays logged out
      } finally {
        setLoading(false);
      }
    };
    silentRefresh();
  }, []);

  // --- Institutional E2EE Handshake ---
  useEffect(() => {
    const initE2EE = async () => {
      if (!user) return;

      const priv = await cryptoService.getPrivateKey(user._id);
      
      // If we have a public key on server AND a local private key, we are secured.
      if (user.publicKey && priv) {
         return; 
      }

      console.log("Initializing Institutional E2EE Protocol (Identity Restoration Required)...");
      try {
        const keyPair = await cryptoService.generateKeyPair();
        await cryptoService.savePrivateKey(user._id, keyPair);
        const pubKeyStr = await cryptoService.exportPublicKey(keyPair.publicKey);
        
        await api.patch('/auth/public-key', { publicKey: pubKeyStr });
        setUser(prev => ({ ...prev, publicKey: pubKeyStr }));
        console.log("Cryptographic identity formally established & synchronized.");
      } catch (err) {
        console.error("E2EE Initialization Failure:", err);
      }
    };

    if (user && token && !loading) {
       initE2EE();
    }
  }, [user?._id, token, loading]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password }, { withCredentials: true });
    setToken(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload, { withCredentials: true });
    setToken(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}, { withCredentials: true }); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }, []);

  const switchRole = useCallback(async (role) => {
    await api.patch('/dashboard/switch-role', { role });
    // After DB processes activeRole shift, explicitly pull a fresh JWT down to the client instance
    const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
    setToken(res.data.data.token);
    setUser(res.data.data.user);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh-token', {}, { withCredentials: true });
      setToken(res.data.data.token);
      setUser(res.data.data.user);
    } catch (e) { /* silent fail */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
