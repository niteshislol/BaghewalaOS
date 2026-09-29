import React, { useEffect, useState } from 'react';
import { Layers, ArrowDown, ShieldCheck, Thermometer, Gauge, Activity, GitCommit } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { useWellStore } from '../stores/wellStore';
import { digitalTwinService } from '../services';
import { WellboreTwinState } from '../types';
import { getTwinState } from '../services/api';

export const WellborePage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [twin, setTwin] = useState<WellboreTwinState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    digitalTwinService.getWellboreTwin(selectedWell).then((data) => {
      setTwin(data);
    });
    getTwinState(selectedWell).then((state) => {
      const resTemp = state.reservoir.temperature_c.value;
      const resPress = state.reservoir.pressure_kpa.value / 100; // Convert to bar roughly
      
      const depthProfile = [
        { depth: 0, pressure: 5.2, temperature: 35.0 },
        { depth: 250, pressure: resPress * 0.2, temperature: 35.0 + (resTemp - 35) * 0.2 },
        { depth: 500, pressure: resPress * 0.4, temperature: 35.0 + (resTemp - 35) * 0.4 },
        { depth: 750, pressure: resPress * 0.6, temperature: 35.0 + (resTemp - 35) * 0.6 },
        { depth: 1000, pressure: resPress * 0.8, temperature: 35.0 + (resTemp - 35) * 0.8 },
        { depth: 1280, pressure: resPress, temperature: resTemp },
      ];
      setTwin(prev => prev ? { ...prev, depthProfile } : { depthProfile });
      setLoading(false);
    });
  }, [selectedWell]);

  if (loading || !twin) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Twin 2: Wellbore Hydrodynamics & Inflow Dynamics"
        subtitle="Beggs–Brill multiphase pipe hydraulics propagating thermal reservoir drawdown up the 7-inch completion toward the downhole sucker rod pump."
        badge="Zero Gas Lock / Stable Inflow"
        badgeType="green"
      />

      {/* Critical Pump Intake Conditions Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-ink-muted">
              Pump Intake Pres (PIP)
            </span>
            <DataProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-2xl font-bold text-ink">{twin.pumpIntakePressure}</span>
            <span className="font-mono text-xs text-ink-muted">bar</span>
          </div>
          <span className="text-[11px] text-status-green font-medium mt-1 block">
            Safe Submergence: +7.0 bar
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-ink-muted">
              Pump Intake Temp (PIT)
            </span>
            <DataProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-2xl font-bold text-ink">{twin.pumpIntakeTemperature}</span>
            <span className="font-mono text-xs text-ink-muted">°C</span>
          </div>
          <span className="text-[11px] text-ink-muted mt-1 block">
            Thermal gradient 0.12 °C/m
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle border-l-[3px] border-l-status-warn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-ink-muted">
              Fluid Viscosity @ Intake
            </span>
            <DataProvenanceBadge type="ESTIMATED" size="sm" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-2xl font-bold text-status-warn">{twin.pumpIntakeViscosity}</span>
            <span className="font-mono text-xs text-ink-muted">cP</span>
          </div>
          <span className="text-[11px] text-status-warn font-medium mt-1 block">
            Elevated Drag (+8 cP vs Res)
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-ink-muted">
              Flow Regime
            </span>
            <DataProvenanceBadge type="MODEL PREDICTION" size="sm" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-lg font-bold text-ink leading-tight">{twin.flowRegime}</span>
          </div>
          <span className="text-[11px] text-ink-muted mt-1 block">
            Uniform emulsion mix
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-ink-muted">
              Sand & Solids Influx
            </span>
            <DataProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-2xl font-bold text-status-green">{twin.sandInfluxPct}</span>
            <span className="font-mono text-xs text-ink-muted">%</span>
          </div>
          <span className="text-[11px] text-status-green font-medium mt-1 block">
            Liner Screen Intact (&lt; 0.25%)
          </span>
        </div>
      </div>

      {/* Depth Profiles & Technical Wellbore Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: TVD Depth vs Pressure & Temperature Chart */}
        <section className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border mb-3 gap-2">
              <div>
                <h3 className="font-heading text-sm font-semibold text-ink">
                  Wellbore Depth Profiles: Pressure (bar) & Temperature (°C)
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Surface wellhead (0 m) down to perfs midpoint (1,280 m TVD)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
                <span className="text-petroleum flex items-center gap-1 font-semibold">● Pressure (bar)</span>
                <span className="text-status-info flex items-center gap-1 font-semibold">● Temp (°C)</span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={twin.depthProfile || []} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="depth" unit=" m TVD" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--border)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: 8,
                      color: 'var(--ink)',
                      fontSize: 11,
                      boxShadow: 'var(--shadow-card)',
                    }}
                    formatter={(val: any, name: any) => [val, name === 'pressure' ? 'Pressure (bar)' : 'Temp (°C)']}
                    labelFormatter={(depth: any) => `TVD Depth: ${depth} m`}
                  />
                  <ReferenceLine
                    x={428.5}
                    stroke="var(--petroleum)"
                    strokeDasharray="4 4"
                    label={{ value: 'Pump Intake 428.5m', fill: 'var(--petroleum)', fontSize: 10 }}
                  />
                  <ReferenceLine
                    x={1280}
                    stroke="var(--status-green)"
                    strokeDasharray="4 4"
                    label={{ value: 'Perfs 1280m', fill: 'var(--status-green)', fontSize: 10 }}
                  />
                  <Line type="monotone" dataKey="pressure" stroke="var(--petroleum)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--petroleum)' }} name="pressure" />
                  <Line type="monotone" dataKey="temperature" stroke="var(--status-info)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--status-info)' }} name="temperature" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-ink-secondary">
            <div><strong className="text-ink">Casing:</strong> 7" 26# L-80</div>
            <div><strong className="text-ink">Tubing:</strong> 3.5" EUE J-55</div>
            <div><strong className="text-ink">Fluid SG:</strong> 0.982 kg/m³</div>
            <div><strong className="text-ink">Head:</strong> 31.2 bar Static</div>
          </div>
        </section>

        {/* Right: Technical Engineering Wellbore Schematic (SURFACE -> WELLHEAD -> CASING -> TUBING -> SRP -> INTAKE -> RESERVOIR) */}
        <section className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-petroleum" />
                <h3 className="font-heading text-sm font-semibold text-ink">
                  Technical Completion Schematic
                </h3>
              </div>
              <span className="text-[10px] font-mono text-ink-muted">TVD Scaled</span>
            </div>

            {/* Vertical Flow Diagram with Engineering Annotations */}
            <div className="space-y-2.5 font-mono text-xs">
              {/* 1. Surface Wellhead */}
              <div className="p-2.5 rounded bg-surface-secondary border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-ink-muted block">SURFACE & WELLHEAD</span>
                  <span className="font-bold text-ink">Christmas Tree & Flowline</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-ink font-semibold">T: 62.4 °C · P: 18.4 bar</div>
                  <div className="text-ink-muted">WHP Backpressure</div>
                </div>
              </div>

              <div className="flex justify-center my-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>

              {/* 2. Casing & Annulus */}
              <div className="p-2.5 rounded bg-surface-secondary border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-ink-muted block">CASING STRING</span>
                  <span className="font-bold text-ink">7" 26# L-80 Casing</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-ink font-semibold">0 – 1,420 m MD</div>
                  <div className="text-status-green">Cement Top @ Surface</div>
                </div>
              </div>

              <div className="flex justify-center my-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>

              {/* 3. Tubing & Rod String */}
              <div className="p-2.5 rounded bg-surface-secondary border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-ink-muted block">TUBING STRING</span>
                  <span className="font-bold text-ink">3.5" EUE J-55 Tubing</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-ink font-semibold">1" & 7/8" Rod String Inside</div>
                  <div className="text-ink-muted">Depth: 0 – 428.5 m</div>
                </div>
              </div>

              <div className="flex justify-center my-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>

              {/* 4. Downhole SRP Pump & Intake */}
              <div className="p-2.5 rounded bg-petroleum-tint border border-petroleum/40 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-petroleum font-semibold block">SRP & PUMP INTAKE</span>
                  <span className="font-bold text-petroleum">API 25-175 RHBC Pump</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-status-warn font-bold">PIT: 184.2 °C · PIP: 38.2 bar</div>
                  <div className="text-status-warn">Intake Viscosity: 92.0 cP</div>
                </div>
              </div>

              <div className="flex justify-center my-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>

              {/* 5. Sand Control Liner */}
              <div className="p-2.5 rounded bg-surface-secondary border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-ink-muted block">SAND CONTROL</span>
                  <span className="font-bold text-ink">Slotted Liner (0.012" Slots)</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-ink font-semibold">950 – 1,280 m MD</div>
                  <div className="text-status-green">Delta P: 0.8 bar (Clean)</div>
                </div>
              </div>

              <div className="flex justify-center my-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-ink-muted" />
              </div>

              {/* 6. Reservoir Perforations & Inflow */}
              <div className="p-2.5 rounded bg-surface-secondary border border-border-subtle flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase text-status-green font-semibold block">RESERVOIR INFLOW</span>
                  <span className="font-bold text-ink">Eocene Mandhali Sand</span>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-status-warn font-bold">BHT: 214.8 °C · BHP: 42.6 bar</div>
                  <div className="text-status-green">Inflow: 205 BOPD (Visc 84 cP)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-ink-secondary">
            <strong className="text-ink">Wellbore Transport Note:</strong> Fluid travel from formation (1,280 m) to pump intake (428.5 m) experiences a cooling of −30.6°C (214.8°C $\to$ 184.2°C), which increases dynamic viscosity from 84.0 cP to 92.0 cP prior to pump suction.
          </div>
        </section>
      </div>
    </div>
  );
};


export default WellborePage;
