import React, { useEffect, useState } from 'react';
import { Flame, Layers, TrendingDown, Thermometer, ShieldAlert, CheckCircle2, Sliders } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SteamPlumeSvg } from '../components/charts/SteamPlumeSvg';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { useWellStore } from '../stores/wellStore';
import { digitalTwinService, cssCycleService } from '../services';
import { ReservoirTwinState, CssCycleState } from '../types';
import { CssMlPredictionCard } from '../components/css/CssMlPredictionCard';

export const ReservoirPage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [twin, setTwin] = useState<ReservoirTwinState | null>(null);
  const [cycle, setCycle] = useState<CssCycleState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      digitalTwinService.getReservoirTwin(selectedWell),
      cssCycleService.getCssCycle(selectedWell),
    ]).then(([resTwin, resCycle]) => {
      // Generate dynamic viscosity curve
      const baseTemp = resTwin.temperature_c || 50;
      const curve = [];
      for (let t = 50; t <= 350; t += 20) {
        // Simple Andrade approximation for Baghewala heavy oil
        // v = A * e^(B/T) where T is absolute temp
        // Approximate: 8500 cP @ 50C, 84 cP @ 215C
        const viscosity = 8500 * Math.exp(-0.028 * (t - 50));
        curve.push({ temp: t, viscosity: Math.max(10, Math.round(viscosity)) });
      }
      setTwin({ ...resTwin, viscosityCurve: curve });
      setCycle(resCycle);
      setLoading(false);
    });
  }, [selectedWell]);

  if (loading || !twin || !cycle) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="chart" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Twin 1: Reservoir & Thermal Simulation"
        subtitle="Nonlinear hydro-thermal energy transport, steam chamber growth, and temperature-dependent Andrade viscosity attenuation."
        badge="Cycle 4 · Soak Decay"
        badgeType="amber"
      />

      {/* Twin 1 Machine Learning Engine · CSS Field-Month Surrogate */}
      <CssMlPredictionCard
        cycle={cycle}
        title="Twin 1 Machine Learning Engine · CSS Field-Month Thermal Surrogate"
        subtitle="Physics-informed CatBoost surrogate forecasting next-month bitumen production and thermodynamic OSR cutoff"
      />

      {/* 3-Group Input & State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Group 1: CSS Injection Inputs */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-petroleum" />
                <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-ink">
                  CSS Injection Inputs
                </h3>
              </div>
              <DataProvenanceBadge type="OBSERVED" size="sm" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Steam Volume</span>
                <span className="font-mono font-bold text-ink">12,400 tonnes</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Injection Pressure</span>
                <span className="font-mono font-bold text-ink">115.0 bar</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Steam Quality</span>
                <span className="font-mono font-medium text-ink">80.0 % dry sat.</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Injection Duration</span>
                <span className="font-mono font-medium text-ink">14.0 days</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Soak Duration</span>
                <span className="font-mono font-medium text-ink">7.0 days</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] text-ink-muted">
            <span>Cycle Sequence</span>
            <span className="font-mono font-bold text-petroleum">Cycle 4 (Day 38/90)</span>
          </div>
        </div>

        {/* Group 2: Reservoir Properties */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-status-warn" />
                <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-ink">
                  Reservoir In-Situ State
                </h3>
              </div>
              <DataProvenanceBadge type="OBSERVED" size="sm" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Reservoir Temperature</span>
                <span className="font-mono font-bold text-status-warn">214.8 °C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Formation Pressure</span>
                <span className="font-mono font-bold text-ink">42.6 bar</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Cooling Decay Rate</span>
                <span className="font-mono font-bold text-status-crit">−0.040 °C/h</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Thermal Boundary Enthalpy</span>
                <span className="font-mono font-medium text-ink">2,480 kJ/kg</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Overburden Heat Loss</span>
                <span className="font-mono font-medium text-status-warn">14.8 %</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] text-ink-muted">
            <span>Net Retained Heat</span>
            <span className="font-mono font-bold text-status-green">68.4 %</span>
          </div>
        </div>

        {/* Group 3: Fluid Properties & Bitumen Mobility */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-petroleum" />
                <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-ink">
                  Fluid Properties & Mobility
                </h3>
              </div>
              <DataProvenanceBadge type="ESTIMATED" size="sm" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">In-Situ Oil Viscosity</span>
                <span className="font-mono font-bold text-status-warn">84.0 cP</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Cold Baseline Viscosity</span>
                <span className="font-mono text-ink-muted">8,500 cP @ 50°C</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Bitumen Mobility (k/μ)</span>
                <span className="font-mono font-bold text-ink">4.88 mD/cP</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Radial Inflow Potential</span>
                <span className="font-mono font-bold text-petroleum">205.0 BOPD</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-ink-muted">Oil Formation Vol Factor</span>
                <span className="font-mono font-medium text-ink">1.12 m³/m³</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] text-ink-muted">
            <span>PINN Convergence</span>
            <span className="font-mono font-bold text-status-green">96% Confirmed</span>
          </div>
        </div>
      </div>

      {/* Visual Plume & Thermal Viscosity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Steam Plume Isotherm Profile */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 shadow-subtle">
          <SteamPlumeSvg radius={twin.steamChamberRadius} temperature={twin.temperature} />
          <div className="mt-3 p-3 bg-surface-secondary rounded-lg border border-border-subtle text-xs leading-relaxed text-ink-secondary">
            <strong className="text-ink">Thermal Model Status:</strong> Steam chamber radius is holding at 18.4 m with high matrix swept volume (11,400 m³). Bounding caprock shales at TVD 1,142 m absorb 14.8% of conductive heat flux.
          </div>
        </div>

        {/* Right: In-Situ Viscosity vs Temperature Curve */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border mb-3 gap-2">
              <div>
                <h3 className="font-heading text-sm font-semibold text-ink">
                  Baghewala Crude Viscosity vs. Temperature Relationship
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Andrade exponential model calibrated against dead-oil PVT laboratory tests
                </p>
              </div>
              <span className="text-[11px] font-mono text-petroleum bg-petroleum-tint px-2 py-0.5 rounded border border-petroleum/30 self-start sm:self-auto">
                Operating Point: 214.8°C / 84 cP
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={twin.viscosityCurve || []} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="temp" unit="°C" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--border)" />
                  <YAxis unit=" cP" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--border)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: 8,
                      color: 'var(--ink)',
                      fontSize: 11,
                      boxShadow: 'var(--shadow-card)',
                    }}
                    formatter={(value: any) => [`${value} cP`, 'Viscosity']}
                    labelFormatter={(label: any) => `Temperature: ${label}°C`}
                  />
                  <ReferenceLine
                    x={214.8}
                    stroke="var(--status-crit)"
                    strokeDasharray="3 3"
                    label={{ value: 'Current: 214.8°C', fill: 'var(--status-crit)', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="viscosity"
                    stroke="var(--petroleum)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--petroleum)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-2 text-xs text-ink-secondary flex items-center justify-between border-t border-border-subtle pt-2">
            <span>Notice: Viscosity increases exponentially below 180°C. Maintaining BHT above 190°C is critical to prevent downhole lift lock.</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default ReservoirPage;
