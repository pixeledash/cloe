import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NotificationsManagerTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Test Notifications Page</h1>
      <p>User: {user?.email || 'Not logged in'}</p>
      <p>Roles: {user?.roles?.join(', ') || 'None'}</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default NotificationsManagerTest;
