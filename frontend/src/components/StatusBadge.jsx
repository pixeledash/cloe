import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return {
          color: 'bg-green-100 text-green-800',
          icon: '✓',
          label: 'Sent'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: '⏳',
          label: 'Pending'
        };
      case 'retrying':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: '🔄',
          label: 'Retrying'
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800',
          icon: '✗',
          label: 'Failed'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: '•',
          label: status || 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
