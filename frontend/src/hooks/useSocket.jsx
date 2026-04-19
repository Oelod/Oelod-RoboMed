import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

/**
 * Institutional Socket Provider
 * Character-perfectly ensures a single, high-fidelity signaling manifold for all clinical datastreams.
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Industrial Discovery: Hardcoding origin for absolute signaling reliability in development
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    socketRef.current = io(socketUrl, {
      auth: { token: localStorage.getItem('token') },
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('🚀 [SocketRegistry] Institutional Handshake Established:', socketRef.current.id);
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.warn('⚠️ [SocketRegistry] Institutional Signal Lost');
      setConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
