import React from 'react';
import { Sparkles } from 'lucide-react';
import { DataProvenanceBadge, ProvenanceType } from './DataProvenanceBadge';

export interface KpiCardData {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  delta?: string;
  arrow?: string;
  deltaNote?: string;
  status?: string;
  range?: string;
  attention?: boolean;
}

interface KpiCardProps {
  kpi: KpiCardData;
  className?: string;
  provenance?: ProvenanceType;
  onExplain?: (label: string, value: string | number, unit: string) => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, className = '', provenance, onExplain }) => {
  const getProvenance = (): ProvenanceType => {
    if (provenance) return provenance;
    if (kpi.id === 'bht' || kpi.id === 'flp' || kpi.id === 'rate') return 'OBSERVED';
    if (kpi.id === 'visc') return 'ESTIMATED';
    if (kpi.id === 'fillage') return 'ACTUAL';
    return 'SYNTHETIC';
  };

  const handleExplain = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplain?.(kpi.label, kpi.value, kpi.unit);
  };

  return (
    <div
      className={`group relative bg-surface rounded-xl p-4 transition-all duration-150 border ${
        kpi.attention
          ? 'border-status-crit/40 border-l-[3px] border-l-status-crit shadow-sm'
          : 'border-border hover:border-border-hover hover:shadow-card'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-secondary truncate">
          {kpi.label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <DataProvenanceBadge type={getProvenance()} size="sm" />
          {onExplain && (
            <button
              type="button"
              onClick={handleExplain}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-ink-muted hover:text-petroleum dark:hover:text-cyan-400 hover:bg-surface-secondary"
              title={`Explain ${kpi.label} with AI Copilot`}
              aria-label={`Explain ${kpi.label} with AI Copilot`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          {kpi.attention && (
            <span className="w-1.5 h-1.5 rounded-full bg-status-crit animate-pulse"></span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mt-2.5">
        <span className="font-mono text-[26px] font-medium tracking-tight text-ink leading-none">
          {kpi.value}
        </span>
        <span className="font-mono text-xs text-ink-muted tracking-normal">
          {kpi.unit}
        </span>
      </div>

      {kpi.delta && (
        <div className="flex items-center gap-1.5 mt-2 font-mono text-xs">
          <span
            className={
              kpi.attention
                ? 'text-status-crit font-medium'
                : kpi.arrow === '↓' && kpi.id === 'bht'
                ? 'text-status-warn-deep'
                : 'text-ink-muted'
            }
          >
            {kpi.arrow} {kpi.delta}
          </span>
          {kpi.deltaNote && (
            <span className="font-sans text-[11px] text-ink-muted truncate">
              {kpi.deltaNote}
            </span>
          )}
        </div>
      )}

      <div className="border-t border-border-subtle mt-3 pt-2.5 text-[11px] text-ink-muted flex items-center justify-between">
        <span>{kpi.range}</span>
        {kpi.status && (
          <span
            className={`text-[10px] font-medium uppercase ${
              kpi.status === 'Critical'
                ? 'text-status-crit'
                : kpi.status === 'Watch'
                ? 'text-status-warn'
                : 'text-status-green'
            }`}
          >
            {kpi.status}
          </span>
        )}
      </div>
    </div>
  );
};
