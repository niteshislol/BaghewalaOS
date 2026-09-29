import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DynamometerChart } from '../components/charts/DynamometerChart';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { useWellStore } from '../stores/wellStore';
import { digitalTwinService } from '../services';
import { SrpTwinState } from '../types';
import { SrpMlConditionCard } from '../components/srp/SrpMlConditionCard';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } };
const pct = (v: number) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%`;
const num = (v: any, d = 2) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';

export const SrpPage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [twin, setTwin] = useState<SrpTwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    digitalTwinService.getSrpTwin(selectedWell)
      .then((data) => { if (active) setTwin(data); })
      .catch((err) => { if (active) setError(err?.message || 'Unable to synchronize with the live twin'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedWell]);

  if (loading || !twin) {
    return <div className="space-y-6"><LoadingSkeleton type="card" /><LoadingSkeleton type="chart" /><LoadingSkeleton type="table" />{error && <p className="text-sm text-status-crit">{error}</p>}</div>;
  }

  const floatRisk = Number(twin.rod_float_risk || twin.rod_float_probability || 0);
  const health = Number(twin.equipment_health || 0);
  const critical = Boolean(twin.rod_floating);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <motion.div variants={itemVariants}>
        <SectionHeader
          title="Twin 3: Sucker Rod Pump & Artificial Lift Diagnostics"
          subtitle="Live mechanical solver output, full-cycle dynamometer reconstruction, rod fatigue indicators, and bounded SRP ML predictions."
          badge={critical ? `Rod float risk ${pct(floatRisk)}` : `Healthy margin ${pct(health)}`}
          badgeType={critical ? 'red' : 'green'}
        />
      </motion.div>

      <motion.div variants={itemVariants}><SrpMlConditionCard twin={twin} /></motion.div>
      <motion.div variants={itemVariants}><DynamometerChart twin={twin} /></motion.div>

      <motion.section variants={itemVariants} className="glass-panel rounded-xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border mb-4 gap-2">
          <div>
            <h3 className="font-heading text-base font-bold text-ink">Live SRP Mechanical Diagnostics</h3>
            <p className="text-xs text-ink-muted mt-0.5">Directly derived from the WagheraOS SRP solver; values are not simulated UI placeholders.</p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded border border-border bg-surface-secondary text-ink-muted">{twin.simulation_mode || 'synthetic_physics_informed_oil_twin'}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Diag label="SPM" value={num(twin.spm)} />
          <Diag label="Effective SPM" value={num(twin.effective_spm)} />
          <Diag label="Fillage" value={pct(Number(twin.fillage || 0))} />
          <Diag label="Rod load max" value={`${num(twin.polished_rod_max_kn)} kN`} />
          <Diag label="Rod load min" value={`${num(twin.polished_rod_min_kn)} kN`} />
          <Diag label="Rod stress" value={`${num(twin.rod_stress_max_mpa, 1)} MPa`} />
          <Diag label="Goodman" value={num(twin.goodman_ratio || twin.goodman, 3)} />
          <Diag label="Impact" value={num(twin.impact_index, 3)} />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Info title="Pump seating" value={twin.pump_seating || '—'} />
          <Info title="Compression depth" value={`${num(twin.compression_depth_m, 1)} m`} />
          <Info title="Gearbox / structural load" value={`${num(twin.gearbox_load_pct, 1)}% / ${num(twin.structural_load_pct, 1)}%`} />
        </div>

        {twin.demo_disclaimer && <p className="mt-4 text-[11px] leading-relaxed text-ink-muted border-t border-border-subtle pt-3">{twin.demo_disclaimer}</p>}
      </motion.section>
    </motion.div>
  );
};

const Diag: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border-subtle bg-surface-secondary/50 p-3"><div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div><div className="font-mono text-sm font-bold text-ink mt-1">{value}</div></div>
);
const Info: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-lg border border-border bg-surface p-3"><span className="text-ink-muted">{title}</span><span className="float-right font-mono font-semibold text-ink">{value}</span></div>
);

export default SrpPage;
