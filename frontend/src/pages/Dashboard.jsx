import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const dashboardCards = [
    {
      title: 'Subjects',
      description: 'Manage academic subjects',
      link: '/academics/subjects',
      icon: '📖',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Classes',
      description: 'Manage classroom classes',
      link: '/academics/classes',
      icon: '📚',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Students',
      description: 'Manage student information and enrollments',
      link: '/academics/students',
      icon: '👨‍🎓',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Start Session',
      description: 'Start a new class session',
      link: '/start-session',
      icon: '🚀',
      roles: ['TEACHER'],
    },
    {
      title: 'Active Sessions',
      description: 'View and manage active sessions',
      link: '/active-sessions',
      icon: '📡',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Mark Attendance',
      description: 'Record student attendance for active sessions',
      link: '/mark-attendance',
      icon: '✓',
      roles: ['TEACHER'],
    },
    {
      title: 'Session Attendance',
      description: 'View attendance records and statistics',
      link: '/session-attendance',
      icon: '📊',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Analytics',
      description: 'View insights and trends',
      link: '/analytics/student',
      icon: '📊',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Reports',
      description: 'Generate and download reports',
      link: '/reports/generate',
      icon: '📄',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Notifications',
      description: 'Send weekly email notifications',
      link: '/notifications/weekly',
      icon: '📧',
      roles: ['ADMIN', 'TEACHER'],
    },
    {
      title: 'Admin Panel',
      description: 'Manage users and roles',
      link: '/admin/users',
      icon: '⚙️',
      roles: ['ADMIN'],
    },
  ];

  const userRoles = user?.roles || [];

  // Filter cards based on user roles
  const visibleCards = dashboardCards.filter(card => 
    card.roles.some(role => userRoles.includes(role))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10 pb-6 border-b-2 border-gray-200">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.first_name || user?.email}!
        </h1>
        <p className="text-gray-600 text-lg">
          {userRoles.length > 0 ? (
            <>
              <span className="font-medium">Role{userRoles.length > 1 ? 's' : ''}:</span>{' '}
              <span className="text-purple-600 font-semibold">{userRoles.join(', ')}</span>
            </>
          ) : (
            'User Dashboard'
          )}
        </p>
      </div>

      {/* Content */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        
        {visibleCards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg mb-2">No modules available for your role.</p>
            <p className="text-gray-500">Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCards.map((card, index) => (
              <Link 
                to={card.link} 
                key={index} 
                className="card card-hover border-2 border-transparent group"
              >
                <div className="text-5xl mb-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-primary text-white rounded-xl shadow-lg p-6">
          <h4 className="text-xl font-bold mb-4 pb-3 border-b border-white/30">
            Account Info
          </h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Email:</span>{' '}
              <span className="opacity-90">{user?.email}</span>
            </p>
            <p>
              <span className="font-semibold">Name:</span>{' '}
              <span className="opacity-90">{user?.first_name} {user?.last_name}</span>
            </p>
            <p>
              <span className="font-semibold">MFA:</span>{' '}
              <span className="opacity-90">
                {user?.mfa_enabled ? 'Enabled ✓' : 'Disabled'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
