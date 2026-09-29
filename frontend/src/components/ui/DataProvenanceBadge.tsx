import React from 'react';

export type ProvenanceType = 'OBSERVED' | 'ESTIMATED' | 'MODEL PREDICTION' | 'ACTUAL' | 'SYNTHETIC';

interface DataProvenanceBadgeProps {
  type: ProvenanceType;
  className?: string;
  size?: 'sm' | 'md';
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({
  type,
  className = '',
  size = 'sm',
}) => {
  const getStyle = () => {
    switch (type) {
      case 'OBSERVED':
        return 'text-status-green bg-status-green-bg border-status-green/30';
      case 'ESTIMATED':
        return 'text-status-info bg-status-info-bg border-status-info/30';
      case 'MODEL PREDICTION':
        return 'text-petroleum bg-petroleum-tint border-petroleum/40';
      case 'ACTUAL':
        return 'text-status-warn bg-status-warn-bg border-status-warn/40';
      case 'SYNTHETIC':
        return 'text-ink-muted bg-surface-secondary border-border';
      default:
        return 'text-ink-secondary bg-surface-secondary border-border';
    }
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold uppercase tracking-wider rounded border select-none ${
        isSmall ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
      } ${getStyle()} ${className}`}
      title={`Data Source Provenance: ${type}`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-70" />
      <span>{type}</span>
    </span>
  );
};
