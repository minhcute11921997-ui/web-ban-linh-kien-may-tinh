import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const PrivateRoute = ({ children, adminOnly = false, allowedRoles }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const roles = allowedRoles || (adminOnly ? ['admin'] : null);
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

export default PrivateRoute;
