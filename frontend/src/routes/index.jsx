import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import MFASettings from '../pages/MFASettings';
import AdminPanel from '../pages/AdminPanel';
import ProfileSettings from '../pages/ProfileSettings';
import Subjects from '../pages/Subjects';
import Classes from '../pages/Classes';
import Students from '../pages/Students';
import StartSession from '../pages/StartSession';
import ActiveSessions from '../pages/ActiveSessions';
import MarkAttendance from '../pages/MarkAttendance';
import SessionAttendance from '../pages/SessionAttendance';
import AnalyticsDashboard from '../pages/AnalyticsDashboard';
import StudentAnalytics from '../pages/StudentAnalytics';
import ClassAnalytics from '../pages/ClassAnalytics';
import NotificationsManager from '../pages/NotificationsManager';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Route>

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Settings & Admin */}
            <Route path="/settings/profile" element={<ProfileSettings />} />
            <Route path="/settings/mfa" element={<MFASettings />} />
            <Route path="/admin/users" element={<AdminPanel />} />
            
            {/* Placeholder routes for other modules - will be implemented later */}
            <Route path="/academics/classes" element={<Classes />} />
            <Route path="/academics/students" element={<Students />} />
            <Route path="/academics/subjects" element={<Subjects />} />
            
            {/* Session Management - Module 3 */}
            <Route path="/start-session" element={<StartSession />} />
            <Route path="/active-sessions" element={<ActiveSessions />} />
            <Route path="/sessions/start" element={<StartSession />} />
            <Route path="/sessions/active" element={<ActiveSessions />} />
            
            {/* Attendance Tracking - Module 4 */}
            <Route path="/mark-attendance" element={<MarkAttendance />} />
            <Route path="/session-attendance" element={<SessionAttendance />} />
            <Route path="/session-attendance/:sessionId" element={<SessionAttendance />} />
            <Route path="/attendance/mark" element={<MarkAttendance />} />
            <Route path="/attendance/session" element={<SessionAttendance />} />
            <Route path="/attendance/session/:sessionId" element={<SessionAttendance />} />
            
            {/* Analytics & Reports - Module 5 & 6 Integrated */}
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/analytics/student/:studentId" element={<StudentAnalytics />} />
            <Route path="/analytics/class/:classId" element={<ClassAnalytics />} />
            
            {/* Notifications - Module 7 */}
            <Route path="/notifications" element={<NotificationsManager />} />
            
            <Route path="/profile" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
