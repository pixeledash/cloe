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
            <Route path="/academics/classes" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Classes</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            <Route path="/academics/students" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Students</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            <Route path="/academics/subjects" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Subjects</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
            <Route path="/sessions/start" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Session</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            <Route path="/sessions/active" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Sessions</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
            <Route path="/attendance/mark" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Mark Attendance</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
            <Route path="/analytics/student" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Analytics</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            <Route path="/analytics/class" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Analytics</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
            <Route path="/reports/generate" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Report</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            <Route path="/reports/view" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">View Reports</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
            <Route path="/notifications/weekly" element={
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Weekly Mail</h2>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            } />
            
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
