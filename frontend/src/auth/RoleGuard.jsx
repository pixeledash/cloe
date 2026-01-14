import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const RoleGuard = ({ children, roles, requireAll = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user.roles || [];
  
  // Check if user has required roles
  let hasAccess = false;
  
  if (requireAll) {
    // User must have ALL specified roles
    hasAccess = roles.every(role => userRoles.includes(role));
  } else {
    // User must have AT LEAST ONE of the specified roles
    hasAccess = roles.some(role => userRoles.includes(role));
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access this page.</p>
        <button 
          onClick={() => window.history.back()}
          className="btn-primary"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
};

export default RoleGuard;
