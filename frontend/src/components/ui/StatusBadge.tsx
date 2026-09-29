import React from 'react';

type ParameterStatus = 'normal' | 'watch' | 'critical' | 'info' | 'locked' | string;

interface StatusBadgeProps {
  status: ParameterStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'text-ink-secondary bg-surface-secondary border-border';

  if (['normal', 'optimal', 'healthy', 'stable', 'agreement'].includes(normalized)) {
    colorClasses = 'text-status-green-deep bg-status-green-bg border-status-green';
  } else if (['watch', 'warning', 'attention'].includes(normalized)) {
    colorClasses = 'text-status-warn-deep bg-status-warn-bg border-status-warn';
  } else if (['critical', 'trip', 'drift alert'].includes(normalized)) {
    colorClasses = 'text-status-crit-deep bg-status-crit-bg border-status-crit';
  } else if (['info', 'telemetry'].includes(normalized)) {
    colorClasses = 'text-status-info-deep bg-status-info-bg border-status-info';
  } else if (['locked', 'fixed'].includes(normalized)) {
    colorClasses = 'text-ink-secondary bg-surface-subtle border-border-dark';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border-l-2 ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
};
