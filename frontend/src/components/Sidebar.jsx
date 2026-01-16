import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'fi fi-ss-home',
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
    },
    {
      name: 'Subjects',
      path: '/academics/subjects',
      icon: 'fi fi-ss-book-bookmark',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Classes',
      path: '/academics/classes',
      icon: 'fi fi-ss-books',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Students',
      path: '/academics/students',
      icon: 'fi fi-ss-users-alt',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Start Session',
      path: '/start-session',
      icon: 'fi fi-ss-play-circle',
      roles: ['TEACHER'],
    },
    {
      name: 'Active Sessions',
      path: '/active-sessions',
      icon: 'fi fi-ss-signal-stream',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Mark Attendance',
      path: '/mark-attendance',
      icon: 'fi fi-ss-checkbox',
      roles: ['TEACHER'],
    },
    {
      name: 'Session Attendance',
      path: '/session-attendance',
      icon: 'fi fi-ss-chart-histogram',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Analytics & Reports',
      path: '/analytics',
      icon: 'fi fi-ss-chart-line-up',
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: 'fi fi-ss-envelope',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      name: 'Admin Panel',
      path: '/admin/users',
      icon: 'fi fi-ss-settings',
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
            <span className="text-lg w-7 text-center">
              <i className={item.icon}></i>
            </span>
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
