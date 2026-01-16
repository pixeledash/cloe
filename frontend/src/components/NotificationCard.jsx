import React from 'react';
import StatusBadge from './StatusBadge';

const NotificationCard = ({ notification, isExpanded, onToggle }) => {
  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'weekly_report':
        return 'fi fi-ss-envelope-open-text';
      case 'low_attendance_alert':
        return 'fi fi-ss-triangle-warning';
      case 'system_notification':
        return 'fi fi-ss-bell';
      default:
        return 'fi fi-ss-envelope';
    }
  };

  const getIconColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'weekly_report':
        return 'text-blue-600';
      case 'low_attendance_alert':
        return 'text-orange-600';
      case 'system_notification':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayDate = notification.sent_at || notification.scheduled_at || notification.created_at;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className={`text-2xl ${getIconColor(notification.notification_type)}`}>
              <i className={getNotificationIcon(notification.notification_type)}></i>
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {notification.notification_type_display || notification.notification_type}
                </h4>
                <StatusBadge status={notification.status} />
              </div>
              <p className="text-sm text-gray-600 mb-1">
                To: <span className="font-medium">{notification.recipient_email}</span>
                {notification.recipient_name && (
                  <span className="text-gray-500"> ({notification.recipient_name})</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(displayDate)}
              </p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 ml-2">
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-500">Subject:</span>
              <p className="text-sm text-gray-900 mt-1">{notification.subject}</p>
            </div>
            
            {notification.error_message && (
              <div className="bg-red-50 p-3 rounded-md">
                <span className="text-xs font-medium text-red-800">Error Message:</span>
                <p className="text-sm text-red-700 mt-1">{notification.error_message}</p>
              </div>
            )}

            {notification.retry_count > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">Retry Count:</span>
                <span className="font-medium text-gray-900">
                  {notification.retry_count} / {notification.max_retries || 3}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {notification.scheduled_at && (
                <div>
                  <span className="text-xs text-gray-500">Scheduled:</span>
                  <p className="text-gray-900 mt-1">{formatDate(notification.scheduled_at)}</p>
                </div>
              )}
              {notification.sent_at && (
                <div>
                  <span className="text-xs text-gray-500">Sent:</span>
                  <p className="text-gray-900 mt-1">{formatDate(notification.sent_at)}</p>
                </div>
              )}
              {notification.failed_at && (
                <div>
                  <span className="text-xs text-gray-500">Failed:</span>
                  <p className="text-gray-900 mt-1">{formatDate(notification.failed_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
