import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute — redirects to /login if unauthenticated.
 * Optionally restricts access to specific roles.
 *
 * @param {string[]} roles - allowed activeRole values (optional)
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.activeRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
