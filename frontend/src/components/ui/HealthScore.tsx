import React from 'react';

interface WellHealth {
  score: number;
  status: string;
  description: string;
  dominantConcern: string;
  subsystems: Array<{ id: string; name: string; score: number; color: string; note: string }>;
}

interface HealthScoreProps {
  health: WellHealth;
  className?: string;
}

export const HealthScore: React.FC<HealthScoreProps> = ({ health, className = '' }) => {
  return (
    <section className={`bg-surface border border-border rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden shadow-subtle ${className}`}>
      {/* Left side: Overall Score */}
      <div className="lg:col-span-4 p-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-muted">
            Well Operational Health
          </span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-mono text-[46px] font-semibold tracking-tight text-ink leading-none">
              {health.score}
            </span>
            <span className="font-mono text-sm text-ink-muted font-normal">
              / 100
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 mt-3.5 px-2.5 py-1 rounded bg-status-warn-bg border-l-2 border-status-warn">
            <span className="text-xs font-semibold tracking-wider uppercase text-status-warn-deep">
              {health.status}
            </span>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-secondary">
            {health.description}
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-border-subtle text-[11px] text-ink-muted">
          <span className="font-medium text-ink-secondary">Dominant concern:</span>{' '}
          {health.dominantConcern}
        </div>
      </div>

      {/* Right side: Subsystem Breakdown */}
      <div className="lg:col-span-8 p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-muted">
            Coupled Subsystem Health Conditions
          </span>
          <span className="text-[11px] text-ink-muted">Weights: 25% | 25% | 30% | 20%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {health.subsystems.map((s) => (
            <div key={s.id} className="flex flex-col">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-ink">
                  {s.name}
                </span>
                <span className="font-mono text-xs font-medium" style={{ color: s.color }}>
                  {s.score} / 100
                </span>
              </div>
              <div className="h-1.5 w-full rounded bg-surface-subtle mt-2 overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{ width: `${s.score}%`, backgroundColor: s.color }}
                />
              </div>
              <span className="text-[11px] text-ink-muted mt-1.5 leading-normal">
                {s.note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-ink-muted">
          <span>Continuous Digital Twin Physics Validation Engine Active</span>
          <span className="text-petroleum-deep font-medium hover:underline cursor-pointer">
            View Physics Residuals →
          </span>
        </div>
      </div>
    </section>
  );
};
