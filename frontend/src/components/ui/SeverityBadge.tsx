import React from 'react';

type AlertSeverity = 'critical' | 'warning' | 'info';

interface SeverityBadgeProps {
  severity: AlertSeverity | string;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  const normalized = severity.toLowerCase();

  let colorClasses = 'text-ink-secondary bg-surface-secondary border-border';

  if (normalized === 'critical') {
    colorClasses = 'text-status-crit-deep bg-status-crit-bg border-status-crit';
  } else if (normalized === 'warning') {
    colorClasses = 'text-status-warn-deep bg-status-warn-bg border-status-warn';
  } else if (normalized === 'info') {
    colorClasses = 'text-status-info-deep bg-status-info-bg border-status-info';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border-l-2 ${colorClasses} ${className}`}
    >
      {severity}
    </span>
  );
};
