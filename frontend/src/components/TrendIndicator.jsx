/**
 * TrendIndicator Component
 * Shows trend direction with arrow and color
 */
export default function TrendIndicator({ trend, showLabel = true }) {
  const config = {
    improving: {
      icon: '↗',
      label: 'Improving',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    declining: {
      icon: '↘',
      label: 'Declining',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    stable: {
      icon: '→',
      label: 'Stable',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    insufficient_data: {
      icon: '?',
      label: 'Insufficient Data',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    no_data: {
      icon: '—',
      label: 'No Data',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  };

  const trendConfig = config[trend] || config.no_data;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${trendConfig.bgColor}`}>
      <span className={`text-xl font-bold ${trendConfig.color}`}>
        {trendConfig.icon}
      </span>
      {showLabel && (
        <span className={`text-sm font-medium ${trendConfig.color}`}>
          {trendConfig.label}
        </span>
      )}
    </div>
  );
}
