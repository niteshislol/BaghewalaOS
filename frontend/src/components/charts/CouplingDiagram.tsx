import React from 'react';
import { ArrowDown, Flame, Waves, Gauge, Activity, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataProvenanceBadge } from '../ui/DataProvenanceBadge';

interface CouplingDiagramProps {
  onSelectTwin?: (twinId: 'reservoir' | 'wellbore' | 'srp' | 'surface') => void;
  className?: string;
}

export const CouplingDiagram: React.FC<CouplingDiagramProps> = ({
  onSelectTwin,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleTwinClick = (id: 'reservoir' | 'wellbore' | 'srp' | 'surface', path: string) => {
    if (onSelectTwin) onSelectTwin(id);
    else navigate(path);
  };

  return (
    <div className={`flex flex-col gap-3 select-none ${className}`}>
      {/* Steam / CSS Header */}
      <div className="bg-petroleum-tint border border-petroleum/30 rounded-lg px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-petroleum" />
          <span className="font-heading text-xs font-semibold uppercase tracking-wider text-petroleum">
            Energy Input: Cyclic Steam Stimulation (CSS) Cycle 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DataProvenanceBadge type="OBSERVED" size="sm" />
          <span className="font-mono text-xs font-semibold text-ink">
            12,400 tonnes steam injected @ 80% quality
          </span>
        </div>
      </div>

      <div className="flex justify-center my-0.5">
        <ArrowDown className="w-4 h-4 text-ink-muted" />
      </div>

      {/* Model 1: Reservoir */}
      <div
        onClick={() => handleTwinClick('reservoir', '/reservoir')}
        className="bg-surface border border-border hover:border-petroleum rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-subtle group"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-petroleum text-white font-mono text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span className="font-heading text-sm font-semibold text-ink group-hover:text-petroleum transition-colors">
              Twin 1: Reservoir / Thermal Model
            </span>
            <span className="px-2 py-0.5 rounded bg-status-warn-bg text-status-warn text-[10px] font-semibold uppercase border border-status-warn/40">
              Cooling −0.04 °C/h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DataProvenanceBadge type="MODEL PREDICTION" size="sm" />
            <span className="text-[11px] text-ink-muted font-mono">Confidence: 96%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Bottomhole Temp</span>
            <span className="font-mono text-sm font-semibold text-ink">214.8 °C</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Reservoir Pressure</span>
            <span className="font-mono text-sm font-semibold text-ink">42.6 bar</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">In-Situ Viscosity</span>
            <span className="font-mono text-sm font-semibold text-status-warn">84.0 cP</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Isotherm Chamber</span>
            <span className="font-mono text-sm font-semibold text-ink">R = 18.4 m</span>
          </div>
        </div>
      </div>

      {/* Coupling Bridge 1 -> 2 */}
      <div className="bg-surface-secondary border-x border-border-subtle px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-secondary font-medium">
          Thermodynamic Variable Transfer (Reservoir → Wellbore):
        </span>
        <div className="flex items-center gap-2 font-mono text-[10.5px]">
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Temp: 214.8°C</span>
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Pres: 42.6 bar</span>
          <span className="px-1.5 py-0.5 bg-status-warn-bg text-status-warn rounded border border-status-warn/30">Visc: 84 cP (Creep)</span>
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Mobility: 4.88 mD/cP</span>
        </div>
      </div>

      <div className="flex justify-center my-0.5">
        <ArrowDown className="w-4 h-4 text-ink-muted" />
      </div>

      {/* Model 2: Wellbore */}
      <div
        onClick={() => handleTwinClick('wellbore', '/wellbore')}
        className="bg-surface border border-border hover:border-petroleum rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-subtle group"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-petroleum text-white font-mono text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="font-heading text-sm font-semibold text-ink group-hover:text-petroleum transition-colors">
              Twin 2: Wellbore & Completion Hydraulics
            </span>
            <span className="px-2 py-0.5 rounded bg-status-green-bg text-status-green text-[10px] font-semibold uppercase border border-status-green/40">
              Stable Inflow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DataProvenanceBadge type="MODEL PREDICTION" size="sm" />
            <span className="text-[11px] text-ink-muted font-mono">Confidence: 94%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Pump Intake Pres (PIP)</span>
            <span className="font-mono text-sm font-semibold text-ink">38.2 bar</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Pump Intake Temp (PIT)</span>
            <span className="font-mono text-sm font-semibold text-ink">184.2 °C</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Intake Fluid Viscosity</span>
            <span className="font-mono text-sm font-semibold text-status-warn">92.0 cP</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Flow Regime</span>
            <span className="font-mono text-sm font-semibold text-ink">Slug / Bubbly</span>
          </div>
        </div>
      </div>

      {/* Coupling Bridge 2 -> 3 */}
      <div className="bg-surface-secondary border-x border-border-subtle px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-secondary font-medium">
          Intake Fluid Loading Transfer (Wellbore → SRP Pump):
        </span>
        <div className="flex items-center gap-2 font-mono text-[10.5px]">
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">PIP: 38.2 bar</span>
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">PIT: 184.2°C</span>
          <span className="px-1.5 py-0.5 bg-status-warn-bg text-status-warn rounded border border-status-warn/30">Intake Visc: 92 cP</span>
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Drawdown: 198 BFPD</span>
        </div>
      </div>

      <div className="flex justify-center my-0.5">
        <ArrowDown className="w-4 h-4 text-ink-muted" />
      </div>

      {/* Model 3: SRP */}
      <div
        onClick={() => handleTwinClick('srp', '/srp-pump')}
        className="bg-surface border border-border hover:border-petroleum rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-subtle group border-l-[3px] border-l-status-crit"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-petroleum text-white font-mono text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span className="font-heading text-sm font-semibold text-ink group-hover:text-petroleum transition-colors">
              Twin 3: Sucker Rod Pump (SRP) & Rod Kinematics
            </span>
            <span className="px-2 py-0.5 rounded bg-status-crit-bg text-status-crit text-[10px] font-semibold uppercase border border-status-crit/40">
              Fluid Pound @ 2.80m
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DataProvenanceBadge type="MODEL PREDICTION" size="sm" />
            <span className="text-[11px] text-ink-muted font-mono">Confidence: 89%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Pump Vol. Fillage</span>
            <span className="font-mono text-sm font-semibold text-status-crit">84.6 %</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Peak Polished Rod Load</span>
            <span className="font-mono text-sm font-semibold text-status-crit">88.4 kN (Yield 90)</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Kinematic Speed</span>
            <span className="font-mono text-sm font-semibold text-ink">8.40 SPM</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Section 2 Stress</span>
            <span className="font-mono text-sm font-semibold text-status-warn">212 MPa (81.5%)</span>
          </div>
        </div>
      </div>

      {/* Coupling Bridge 3 -> 4 */}
      <div className="bg-surface-secondary border-x border-border-subtle px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-secondary font-medium">
          Mechanical Lift Output Transfer (SRP → Surface Gathering):
        </span>
        <div className="flex items-center gap-2 font-mono text-[10.5px]">
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Pump Cap: 205 BOPD</span>
          <span className="px-1.5 py-0.5 bg-status-crit-bg text-status-crit rounded border border-status-crit/30">Fillage: 84.6%</span>
          <span className="px-1.5 py-0.5 bg-surface rounded border border-border">Liquid Delivered: 320 BFPD</span>
        </div>
      </div>

      <div className="flex justify-center my-0.5">
        <ArrowDown className="w-4 h-4 text-ink-muted" />
      </div>

      {/* Model 4: Surface */}
      <div
        onClick={() => handleTwinClick('surface', '/surface-production')}
        className="bg-surface border border-border hover:border-petroleum rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-subtle group"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-petroleum text-white font-mono text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span className="font-heading text-sm font-semibold text-ink group-hover:text-petroleum transition-colors">
              Twin 4: Surface Gathering & Reconciled Production
            </span>
            <span className="px-2 py-0.5 rounded bg-status-warn-bg text-status-warn text-[10px] font-semibold uppercase border border-status-warn/40">
              Gap: −13.8 BOPD (−7.0%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DataProvenanceBadge type="ACTUAL" size="sm" />
            <span className="text-[11px] text-ink-muted font-mono">Confidence: 91%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Predicted Oil Rate</span>
            <span className="font-mono text-sm font-semibold text-ink">198.0 BOPD</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Actual Reconciled Rate</span>
            <span className="font-mono text-sm font-semibold text-petroleum">184.2 BOPD</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Production Gap</span>
            <span className="font-mono text-sm font-semibold text-status-crit">−13.8 BOPD</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-muted uppercase block">Instantaneous OSR</span>
            <span className="font-mono text-sm font-semibold text-ink">0.39 m³/t</span>
          </div>
        </div>
      </div>

      {/* Model Agreement Footer */}
      <div className="mt-2 bg-surface border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-subtle">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-status-green" />
          <span className="font-heading font-semibold text-ink">
            Overall Model Agreement: <span className="font-mono text-petroleum">93%</span>
          </span>
          <span className="text-ink-muted">· Continuous PINN & SCADA Reconciled</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/model-comparison')}
          className="text-petroleum hover:underline font-semibold text-xs"
        >
          Open Model Validation Matrix →
        </button>
      </div>
    </div>
  );
};
