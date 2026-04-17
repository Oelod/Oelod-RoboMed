import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';

export default function GlobalNotifications() {
  const { socket } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      // notif is expected to have { type, title, message, relatedId }
      toast(
        (t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold flex items-center gap-2">
               <span>📬</span> {notif.title}
            </span>
            <span className="text-sm opacity-80">{notif.message}</span>
          </div>
        ),
        {
          duration: 6000,
          position: 'top-right',
          style: {
            background: '#111827',
            color: '#F3F4F6',
            border: '1px solid #374151',
            borderRadius: '1rem',
          },
        }
      );

      // Auto-refresh relevant data streams
      if (notif.relatedId) {
        queryClient.invalidateQueries({ queryKey: ['case', notif.relatedId] });
      }
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });

      // Specific refreshes for Lab/Pharmacy
      if (notif.type === 'LAB_RESULT_UPLOADED' || notif.type === 'LAB_REQUESTED') {
        queryClient.invalidateQueries({ queryKey: ['lab-queue'] });
        queryClient.invalidateQueries({ queryKey: ['lab-history'] });
      }
      if (notif.type === 'PRESCRIPTION_ISSUED') {
         queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, queryClient]);

  return <Toaster />;
}
