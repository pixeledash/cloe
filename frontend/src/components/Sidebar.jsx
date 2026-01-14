import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '🏠',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Classes',
      path: '/academics/classes',
      icon: '📚',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Students',
      path: '/academics/students',
      icon: '👥',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Subjects',
      path: '/academics/subjects',
      icon: '📖',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Start Session',
      path: '/sessions/start',
      icon: '▶️',
      roles: ['TEACHER'],
    },
    {
      name: 'Active Sessions',
      path: '/sessions/active',
      icon: '🔴',
      roles: ['TEACHER'],
    },
    {
      name: 'Mark Attendance',
      path: '/attendance/mark',
      icon: '✓',
      roles: ['TEACHER'],
    },
    {
      name: 'Analytics',
      path: '/analytics/student',
      icon: '📊',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Reports',
      path: '/reports/generate',
      icon: '📄',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Notifications',
      path: '/notifications/weekly',
      icon: '📧',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Admin Panel',
      path: '/admin/users',
      icon: '⚙️',
      roles: ['ADMIN'],
    },
  ];

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems.filter(item =>
    item.roles.some(role => userRoles.includes(role))
  );

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white shadow-lg 
                      overflow-y-auto z-40 transition-transform duration-300
                      scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <nav className="flex flex-col py-5">
        {visibleMenuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-4 text-gray-700 transition-all duration-200
               border-l-3 border-transparent hover:bg-gray-50 hover:text-purple-600
               ${isActive 
                 ? 'bg-purple-50 text-purple-600 border-l-purple-600 font-semibold' 
                 : ''
               }`
            }
          >
            <span className="text-xl w-7 text-center">{item.icon}</span>
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
