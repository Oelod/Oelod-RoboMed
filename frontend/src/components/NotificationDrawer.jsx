import { useState, useRef, useEffect } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close drawer when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    if (notif.relatedId) {
      // Assuming relatedId is the caseId for most types
      navigate(`/cases/${notif.relatedId}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={drawerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-[100]">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-gray-800 cursor-pointer transition-colors hover:bg-gray-800 ${!notif.isRead ? 'bg-brand-900/10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold ${!notif.isRead ? 'text-brand-400' : 'text-gray-400'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2">{notif.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-gray-950/50 text-center border-t border-gray-800">
             <span className="text-[10px] text-gray-600 uppercase font-bold">End of updates</span>
          </div>
        </div>
      )}
    </div>
  );
}
