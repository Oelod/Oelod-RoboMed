import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthContext } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user, refreshUser } = useAuthContext();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return;
    }

    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      if (user?.activeRole === 'doctor' && user?.specialization) {
        socketRef.current.emit('join_specialty', user.specialization);
      }
    });

    socketRef.current.on('role_update', () => {
      refreshUser();
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    return () => { 
      socketRef.current?.disconnect(); 
      setConnected(false); 
    };
  }, [token, user, refreshUser]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
