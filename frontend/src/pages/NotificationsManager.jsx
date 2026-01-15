import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import notificationsService from '../api/notificationsService';
import NotificationCard from '../components/NotificationCard';

const NotificationsManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Weekly Reports state
  const [sendToAll, setSendToAll] = useState(true);
  const [studentEmails, setStudentEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [sendingReports, setSendingReports] = useState(false);

  // Low Attendance Alerts state
  const [threshold, setThreshold] = useState(75.0);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  // Notification History state
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    notification_type: '',
    status: '',
    recipient_email: ''
  });
  const [expandedId, setExpandedId] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // If user is not loaded yet, show loading
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading user...</p>
        </div>
      </div>
    );
  }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  }, []);

  // Load notifications on mount and when filters change
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationsService.listNotifications(filters);
        setNotifications(Array.isArray(data) ? data : []); // Ensure it's an array
        setLoading(false);
      } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('Failed to load notifications', 'error');
        setNotifications([]); // Set empty array on error
        setLoading(false);
      }
    };
    
    loadNotifications();
  }, [filters.notification_type, filters.status, filters.recipient_email, showToast]);

  const refreshNotifications = () => {
    setFilters({ ...filters }); // Trigger reload
  };

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!studentEmails.includes(email)) {
        setStudentEmails([...studentEmails, email]);
        setEmailInput('');
      } else {
        showToast('Email already added', 'error');
      }
    } else {
      showToast('Please enter a valid email address', 'error');
    }
  };

  const handleRemoveEmail = (email) => {
    setStudentEmails(studentEmails.filter(e => e !== email));
  };

  const handleSendWeeklyReports = async () => {
    if (!sendToAll && studentEmails.length === 0) {
      showToast('Please add at least one student email', 'error');
      return;
    }

    try {
      setSendingReports(true);
      const result = await notificationsService.triggerWeeklyReports(sendToAll, studentEmails);
      showToast(`${result.count} weekly report(s) queued successfully!`, 'success');
      setStudentEmails([]);
      setSendToAll(true);
      refreshNotifications(); // Refresh list
    } catch (error) {
      console.error('Error sending weekly reports:', error);
      showToast(error.response?.data?.error || 'Failed to send weekly reports', 'error');
    } finally {
      setSendingReports(false);
    }
  };

  const handleSendLowAttendanceAlerts = async () => {
    if (threshold < 0 || threshold > 100) {
      showToast('Threshold must be between 0 and 100', 'error');
      return;
    }

    try {
      setSendingAlerts(true);
      const result = await notificationsService.triggerLowAttendanceAlerts(threshold);
      
      if (result.count === 0) {
        showToast(`No students found with attendance below ${threshold}%`, 'info');
      } else {
        const studentsList = result.students_alerted
          ?.map(s => `${s.name} (${s.attendance_rate}%)`)
          .join(', ') || '';
        showToast(
          `${result.count} alert(s) sent to: ${studentsList}`,
          'success'
        );
      }
      refreshNotifications(); // Refresh list
    } catch (error) {
      console.error('Error sending low attendance alerts:', error);
      showToast(error.response?.data?.error || 'Failed to send alerts', 'error');
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const userRoles = user?.roles || [];
  const canTriggerEmails = userRoles.includes('ADMIN') || userRoles.includes('TEACHER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">📧 Notifications & Email Management</h1>
        <p className="text-gray-600 mt-2">Send automated reports and alerts to students</p>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-500' :
          toast.type === 'info' ? 'bg-blue-500' :
          'bg-green-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Admin/Teacher Only Sections */}
      {canTriggerEmails && (
        <div className="space-y-6 mb-8">
          {/* Weekly Reports Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">📬</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Send Weekly Reports</h2>
                <p className="text-sm text-gray-600">Send attendance reports for the past 7 days</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={sendToAll}
                    onChange={() => setSendToAll(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Send to all students</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!sendToAll}
                    onChange={() => setSendToAll(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Send to specific students</span>
                </label>
              </div>

              {!sendToAll && (
                <div className="ml-6 space-y-2">
                  <form onSubmit={handleAddEmail} className="flex space-x-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="student@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Add
                    </button>
                  </form>

                  {studentEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {studentEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {email}
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSendWeeklyReports}
                  disabled={sendingReports}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {sendingReports ? 'Sending...' : 'Send Reports'}
                </button>
              </div>
            </div>
          </div>

          {/* Low Attendance Alerts Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Send Low Attendance Alerts</h2>
                <p className="text-sm text-gray-600">Alert students with attendance below threshold</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-700 font-medium">Threshold:</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSendLowAttendanceAlerts}
                  disabled={sendingAlerts}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {sendingAlerts ? 'Sending...' : 'Send Alerts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification History Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification History</h2>
              <p className="text-sm text-gray-600">View all sent and pending notifications</p>
            </div>
          </div>
          <button
            onClick={refreshNotifications}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={filters.notification_type}
            onChange={(e) => handleFilterChange('notification_type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="weekly_report">Weekly Report</option>
            <option value="low_attendance_alert">Low Attendance Alert</option>
            <option value="system_notification">System Notification</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>

          <input
            type="text"
            value={filters.recipient_email}
            onChange={(e) => handleFilterChange('recipient_email', e.target.value)}
            placeholder="Search by email..."
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">📭</span>
            <p className="text-gray-600 mt-4">No notifications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                isExpanded={expandedId === notification.id}
                onToggle={() => toggleExpanded(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsManager;
