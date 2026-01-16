import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50">
      <div className="h-full px-6 lg:px-8 flex items-center justify-between max-w-full">
        {/* Brand */}
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-gray-900 hover:opacity-80 transition-opacity"
        >
          <img 
            src="/logo.png" 
            alt="Cloe Logo" 
            className="h-10 object-contain"
          />
          <img 
            src="/text.png" 
            alt="Cloe" 
            className="h-8 object-contain"
          />
        </Link>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium text-sm hidden md:inline">
            {user?.first_name || user?.email}
          </span>
          
          <div className="relative group">
            {/* Avatar Button */}
            <button className="w-10 h-10 rounded-full bg-gradient-primary text-white font-semibold 
                             hover:scale-110 transition-transform duration-200 flex items-center justify-center">
              {user?.first_name?.[0] || user?.email?.[0] || 'U'}
            </button>
            
            {/* Dropdown */}
            <div className="absolute right-0 top-12 hidden group-hover:block bg-white min-w-[250px] 
                          shadow-xl rounded-lg overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="font-semibold text-gray-900 text-sm">{user?.email}</p>
                <p className="text-gray-600 text-xs mt-1 capitalize">
                  {user?.roles?.join(', ') || 'No roles'}
                </p>
              </div>
              
              {/* Menu Items */}
              <Link 
                to="/settings/profile" 
                className="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
              
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 
                         transition-colors border-t border-gray-200 text-sm font-medium flex items-center gap-2"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
