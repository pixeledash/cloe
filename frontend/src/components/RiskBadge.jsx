/**
 * RiskBadge Component
 * Displays risk level with appropriate color and icon
 */
export default function RiskBadge({ level, size = 'md' }) {
  const config = {
    low: {
      label: 'Low Risk',
      icon: '🟢',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    medium: {
      label: 'Medium Risk',
      icon: '🟡',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    },
    high: {
      label: 'High Risk',
      icon: '🔴',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
    unknown: {
      label: 'Unknown',
      icon: '⚪',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const riskConfig = config[level] || config.unknown;

  return (
    <span
      className={`
        inline-flex items-center gap-2 rounded-full font-semibold border
        ${riskConfig.bgColor} ${riskConfig.textColor} ${riskConfig.borderColor}
        ${sizeClasses[size]}
      `}
    >
      <span>{riskConfig.icon}</span>
      <span>{riskConfig.label}</span>
    </span>
  );
}
