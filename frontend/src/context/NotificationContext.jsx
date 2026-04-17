import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocketContext } from './SocketContext';
import { useAuthContext } from './AuthContext';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../api/notifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuthContext();
  const { socket } = useSocketContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    try {
      const [notifsRes, countRes] = await Promise.all([
        getNotifications(),
        getUnreadCount()
      ]);
      setNotifications(notifsRes.data.notifications);
      setUnreadCount(countRes.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notif) => {
      // Add to list and increment count
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      // Optional: Browser notification or toast logic could go here
    };

    socket.on('notification', handleNewNotification);
    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, user]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead: handleMarkRead, 
      markAllAsRead: handleMarkAllRead,
      refresh: fetchInitialData 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
