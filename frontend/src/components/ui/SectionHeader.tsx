import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'default' | 'amber' | 'green' | 'red';
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeType = 'default',
  actions,
  className = '',
}) => {
  const badgeClasses = {
    default: 'bg-surface-secondary text-ink-secondary border-border',
    amber: 'bg-status-warn-bg text-status-warn-deep border-status-warn',
    green: 'bg-status-green-bg text-status-green-deep border-status-green',
    red: 'bg-status-crit-bg text-status-crit-deep border-status-crit',
  }[badgeType];

  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border mb-6 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-heading text-xl md:text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {badge && (
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${badgeClasses}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-ink-secondary mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
