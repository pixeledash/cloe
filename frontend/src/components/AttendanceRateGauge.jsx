/**
 * AttendanceRateGauge Component
 * Circular progress indicator for attendance rate
 */
export default function AttendanceRateGauge({ rate, size = 'md', showLabel = true }) {
  const radius = size === 'lg' ? 70 : size === 'md' ? 50 : 35;
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  // Determine color based on rate
  const getColor = (rate) => {
    if (rate >= 85) return '#10b981'; // green-500
    if (rate >= 70) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
  };

  const color = getColor(rate);

  const svgSize = radius * 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg height={svgSize} width={svgSize}>
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        {/* Percentage text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize={size === 'lg' ? '28' : size === 'md' ? '20' : '14'}
          fontWeight="bold"
          fill={color}
        >
          {rate.toFixed(0)}%
        </text>
      </svg>
      {showLabel && (
        <span className="text-sm text-gray-600 font-medium">Attendance Rate</span>
      )}
    </div>
  );
}
