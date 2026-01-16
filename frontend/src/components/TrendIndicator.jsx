/**
 * TrendIndicator Component
 * Shows trend direction with arrow and color
 */
export default function TrendIndicator({ trend, showLabel = true }) {
  const config = {
    improving: {
      icon: 'fi fi-ss-arrow-trend-up',
      label: 'Improving',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    declining: {
      icon: 'fi fi-ss-arrow-trend-down',
      label: 'Declining',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    stable: {
      icon: 'fi fi-ss-arrow-right',
      label: 'Stable',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    insufficient_data: {
      icon: 'fi fi-ss-interrogation',
      label: 'Insufficient Data',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    no_data: {
      icon: 'fi fi-ss-minus-small',
      label: 'No Data',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  };

  const trendConfig = config[trend] || config.no_data;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${trendConfig.bgColor}`}>
      <i className={`${trendConfig.icon} ${trendConfig.color}`}></i>
      {showLabel && (
        <span className={`text-sm font-medium ${trendConfig.color}`}>
          {trendConfig.label}
        </span>
      )}
    </div>
  );
}
