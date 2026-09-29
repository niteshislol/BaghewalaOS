import React from 'react';
import { Activity, Brain, Gauge, ShieldCheck, TrendingUp, TriangleAlert } from 'lucide-react';

interface SrpMlConditionCardProps {
  twin?: any;
}

const pct = (value: number) => `${Math.max(0, Math.min(100, value * 100)).toFixed(1)}%`;
const fmt = (value: number, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';

export const SrpMlConditionCard: React.FC<SrpMlConditionCardProps> = ({ twin = {} }) => {
  const ml = twin.srp_ml || {};
  const predictions = ml.predictions || {};
  const loaded = ml.status === 'loaded';
  const floating = Boolean(twin.rod_floating);
  const risk = Number(twin.rod_float_risk || twin.rod_float_probability || 0);
  const health = Number(twin.equipment_health || 0);
  const classification = floating ? 'Rod Float Risk' : Number(twin.impact_shock || 0) > 0.35 ? 'Impact / Fluid Loading' : 'Stable Mechanical Load';
  const tone = floating ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5';

  return (
    <div className={`rounded-xl border p-6 relative overflow-hidden ${tone}`}>
      <div className="absolute -right-24 -top-24 w-72 h-72 bg-cyan-400/5 rounded-full blur-3xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">SRP Performance Model</h2>
            <p className="text-sm text-ink-muted mt-0.5">Physics-first twin diagnostics with a bounded ML surrogate cross-check</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface/70">
            <ShieldCheck className={`w-4 h-4 ${loaded ? 'text-status-green' : 'text-status-warn'}`} />
            <span className={`text-xs font-semibold ${loaded ? 'text-status-green' : 'text-status-warn'}`}>
              {loaded ? 'Surrogate loaded' : 'Surrogate unavailable'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Metric label="Rod Float Risk" value={pct(risk)} icon={<TriangleAlert className="w-4 h-4" />} detail={classification} />
          <Metric label="Pump Fillage" value={pct(Number(twin.fillage || twin.pump_fillage || 0))} icon={<Gauge className="w-4 h-4" />} detail={`Eff. ${pct(Number(twin.pump_condition || 0))}`} />
          <Metric label="Goodman Ratio" value={fmt(Number(twin.goodman_ratio || twin.goodman || 0), 3)} icon={<Activity className="w-4 h-4" />} detail={`Stress ${fmt(Number(twin.rod_stress_max_mpa), 1)} MPa`} />
          <Metric label="Equipment Health" value={pct(health)} icon={<TrendingUp className="w-4 h-4" />} detail={`Failure ${pct(Number(twin.failure_probability || 0))}`} />
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Model prediction cross-check</p>
              <p className="text-xs text-ink-secondary mt-1">v{ml.model_version || '—'} · {ml.algorithm || '—'}</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-surface-secondary border border-border text-ink-muted">{ml.provenance || 'MODEL_PREDICTION'}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Pred label="Pump η" value={predictions.pump_efficiency_pct} suffix="%" />
            <Pred label="PPRL" value={Number.isFinite(predictions.PPRL_N) ? predictions.PPRL_N / 1000 : null} suffix="kN" />
            <Pred label="MPRL" value={Number.isFinite(predictions.MPRL_N) ? predictions.MPRL_N / 1000 : null} suffix="kN" />
            <Pred label="Load range" value={Number.isFinite(predictions.load_range_N) ? predictions.load_range_N / 1000 : null} suffix="kN" />
            <Pred label="Mean load" value={Number.isFinite(predictions.mean_load_N) ? predictions.mean_load_N / 1000 : null} suffix="kN" />
            <Pred label="Card area" value={predictions.card_area_J} suffix="J" />
          </div>
          {ml.important_caveat && <p className="text-[11px] text-ink-muted mt-3 leading-relaxed">{ml.important_caveat}</p>}
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; detail: string; icon: React.ReactNode }> = ({ label, value, detail, icon }) => (
  <div className="rounded-lg border border-border bg-surface/60 p-4">
    <div className="flex items-center gap-2 text-ink-muted text-xs font-semibold"><span className="text-cyan-400">{icon}</span>{label}</div>
    <div className="text-2xl font-bold text-ink mt-2 font-mono">{value}</div>
    <div className="text-xs text-ink-muted mt-1">{detail}</div>
  </div>
);

const Pred: React.FC<{ label: string; value: number | null | undefined; suffix: string }> = ({ label, value, suffix }) => (
  <div className="rounded-md bg-surface-secondary/60 border border-border-subtle p-2.5">
    <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
    <div className="font-mono text-sm font-bold text-ink mt-1">{value == null || !Number.isFinite(value) ? '—' : value.toFixed(2)} <span className="text-[10px] font-medium text-ink-muted">{suffix}</span></div>
  </div>
);

export default SrpMlConditionCard;
