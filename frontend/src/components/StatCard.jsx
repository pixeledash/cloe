/**
 * StatCard Component
 * Reusable card for displaying statistics
 */
export default function StatCard({ title, value, icon, color = 'blue', subtitle, trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className={`card ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-4xl opacity-80">{icon}</div>
        )}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend.direction] || trendColors.neutral}`}>
          {trend.direction === 'up' && <span>↗</span>}
          {trend.direction === 'down' && <span>↘</span>}
          {trend.direction === 'neutral' && <span>→</span>}
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}
