import React from 'react';
import { ArrowRight, Flame, Layers, Activity, Gauge, TrendingDown, AlertTriangle } from 'lucide-react';

interface CauseStep {
  id: string;
  stage: string;
  title: string;
  delta: string;
  subtext: string;
  severity: 'normal' | 'watch' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
}

interface CauseChainProps {
  className?: string;
  compact?: boolean;
}

export const defaultCauseSteps: CauseStep[] = [
  {
    id: 'reservoir',
    stage: 'Reservoir Twin',
    title: 'Reservoir Cooling',
    delta: '−3.8 °C',
    subtext: 'Falloff rate −0.04°C/h',
    severity: 'watch',
    icon: Flame,
  },
  {
    id: 'wellbore',
    stage: 'Fluid Shift',
    title: 'Viscosity Increase',
    delta: '+11.0 %',
    subtext: '84.0 cP @ pump intake',
    severity: 'watch',
    icon: Layers,
  },
  {
    id: 'loading',
    stage: 'SRP Dynamics',
    title: 'Pump Loading Rise',
    delta: '+6.2 %',
    subtext: 'Downstroke drag resistance',
    severity: 'critical',
    icon: Activity,
  },
  {
    id: 'fillage',
    stage: 'Chamber Intake',
    title: 'Pump Fillage Drop',
    delta: '−3.6 %',
    subtext: '84.6% · Fluid pound @ 2.80m',
    severity: 'critical',
    icon: Gauge,
  },
  {
    id: 'production',
    stage: 'Surface Output',
    title: 'Net Oil Deficit',
    delta: '−7.0 %',
    subtext: '184.2 vs 198.0 BOPD',
    severity: 'critical',
    icon: TrendingDown,
  },
];

export const CauseChain: React.FC<CauseChainProps> = ({ className = '', compact = false }) => {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-4 shadow-subtle ${className}`}
      role="region"
      aria-label="Engineering Cause-and-Effect Propagation Chain"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-petroleum-tint text-petroleum flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading text-xs md:text-sm font-semibold text-ink leading-tight">
              Physical Cause-and-Effect Propagation Chain
            </h3>
            <p className="text-[11px] text-ink-muted">
              Cross-model causality: How subsurface thermal falloff propagates directly to surface production deficit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-[10px] text-ink-secondary bg-surface-secondary px-2 py-0.5 rounded border border-border">
          <span>Well BW-017</span>
          <span className="text-border-dark">·</span>
          <span>CSS Cycle 4</span>
        </div>
      </div>

      {/* Chain Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 relative">
        {defaultCauseSteps.map((step, index) => {
          const Icon = step.icon;
          const isCrit = step.severity === 'critical';
          const isLast = index === defaultCauseSteps.length - 1;

          return (
            <div key={step.id} className="relative flex flex-col">
              <div
                className={`p-3 rounded-lg border flex-1 flex flex-col justify-between transition-all bg-surface-secondary ${
                  isCrit
                    ? 'border-status-crit/40 border-l-[3px] border-l-status-crit'
                    : 'border-status-warn/40 border-l-[3px] border-l-status-warn'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] uppercase font-semibold tracking-wider text-ink-muted">
                      {step.stage}
                    </span>
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isCrit ? 'text-status-crit' : 'text-status-warn'
                      }`}
                    />
                  </div>
                  <h4 className="font-heading text-xs font-semibold text-ink mt-1.5 leading-snug">
                    {step.title}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border-subtle">
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`font-mono text-sm font-bold ${
                        isCrit ? 'text-status-crit' : 'text-status-warn'
                      }`}
                    >
                      {step.delta}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-ink-secondary mt-0.5 leading-tight">
                    {step.subtext}
                  </p>
                </div>
              </div>

              {/* Arrow separator on desktop */}
              {!isLast && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-surface border border-border items-center justify-center text-ink-muted shadow-sm">
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
