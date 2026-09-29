import React, { useState } from 'react';
import { Lightbulb, ArrowRight, ShieldCheck, Cpu, GitBranch, CheckCircle2, TrendingDown, AlertTriangle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CauseChain } from '../components/ui/CauseChain';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { mockAiInsight } from '../mock/aiInsights';

export const AiInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedHorizon, setSelectedHorizon] = useState<'24h' | '72h' | '7d' | '90d'>('72h');

  const insight = mockAiInsight;
  const horizonData = insight.horizons[selectedHorizon];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Physics-Informed AI Intelligence & Causal Diagnostics"
        subtitle="Physics-informed neural network (PINN) reasoning, SHAP gradient feature attributions, and forward multi-horizon production envelopes for BW-017."
        badge="Grounded Physics Reasoning"
        badgeType="amber"
      />

      {/* Engineering Insight Card (High Priority) */}
      <section className="bg-surface border border-border border-l-4 border-l-status-crit rounded-xl p-5 shadow-subtle flex flex-col justify-between">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-status-crit bg-status-crit-bg px-2 py-0.5 rounded border border-status-crit/40">
                ENGINEERING INSIGHT · HIGH PRIORITY
              </span>
              <DataProvenanceBadge type="MODEL PREDICTION" size="sm" />
              <span className="text-xs text-ink-muted font-mono">Model: PINN-X4 Coupling</span>
            </div>

            <h2 className="font-heading text-lg font-bold text-ink mt-2.5">
              Production is 7.0% below coupled model expectation (−13.8 BOPD Deficit)
            </h2>

            <p className="text-xs text-ink-secondary mt-1.5 max-w-4xl leading-relaxed">
              Continuous thermodynamic model tracking indicates thermal dissipation in the reservoir is accelerating downhole viscosity creep, triggering premature pump chamber starvation on Sucker Rod Pump BW-017.
            </p>
          </div>

          <div className="text-right shrink-0 bg-surface-secondary p-3 rounded-lg border border-border-subtle self-start md:self-auto">
            <span className="text-[9.5px] uppercase font-semibold text-ink-muted block">Measured Gap</span>
            <span className="font-mono text-2xl font-bold text-status-crit">−13.8 BOPD</span>
            <span className="text-[11px] text-status-crit font-medium block">−7.0% vs predicted</span>
          </div>
        </div>

        {/* Structured Evidence Section */}
        <div className="mt-4 pt-3.5 border-t border-border-subtle">
          <span className="text-[10.5px] uppercase font-semibold tracking-wider text-ink-muted block mb-2.5">
            Empirical Physical Evidence
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-ink-muted font-sans">Reservoir Temp</span>
                <DataProvenanceBadge type="OBSERVED" size="sm" />
              </div>
              <span className="font-bold text-ink text-sm mt-1 block">214.8 °C</span>
              <span className="text-[11px] text-status-warn font-semibold mt-0.5 block">↓ 3.8 °C over cycle</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-ink-muted font-sans">Oil Viscosity</span>
                <DataProvenanceBadge type="ESTIMATED" size="sm" />
              </div>
              <span className="font-bold text-ink text-sm mt-1 block">84.0 cP</span>
              <span className="text-[11px] text-status-warn font-semibold mt-0.5 block">↑ 11.0 % elevation</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle border-l-2 border-l-status-crit">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-ink-muted font-sans">Pump Fillage</span>
                <DataProvenanceBadge type="ACTUAL" size="sm" />
              </div>
              <span className="font-bold text-status-crit text-sm mt-1 block">84.6 %</span>
              <span className="text-[11px] text-status-crit font-semibold mt-0.5 block">↓ 3.6 % (Fluid pound)</span>
            </div>

            <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] text-ink-muted font-sans">Actual Production</span>
                <DataProvenanceBadge type="ACTUAL" size="sm" />
              </div>
              <span className="font-bold text-ink text-sm mt-1 block">184.2 BOPD</span>
              <span className="text-[11px] text-status-crit font-semibold mt-0.5 block">↓ 7.0 % vs twin model</span>
            </div>
          </div>
        </div>

        {/* Causal Chain & Recommended Action */}
        <div className="mt-4 pt-3.5 border-t border-border-subtle grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
            <span className="text-[10.5px] uppercase font-bold text-ink-muted tracking-wider block">
              Likely Causal Chain:
            </span>
            <p className="text-xs text-ink font-mono font-medium mt-1">
              Cooling (−0.04°C/h) → Viscosity (+11%) → Downstroke Drag (+6.2%) → Incomplete Fillage (84.6%) → Production Deficit (−7.0%)
            </p>
          </div>

          <div className="p-3 rounded-lg bg-petroleum-tint border border-petroleum/30 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10.5px] uppercase font-bold text-petroleum tracking-wider block">
                Recommended Engineering Investigation:
              </span>
              <p className="text-xs text-ink font-medium mt-0.5">
                Trim VFD stroke rate from 8.4 to 7.8 SPM and review pump intake gas anchor clearance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/recommendations')}
              className="h-7 px-2.5 rounded bg-petroleum text-white text-xs font-bold shrink-0 hover:bg-petroleum-hover transition-colors"
            >
              Open Action
            </button>
          </div>
        </div>
      </section>

      {/* Embedded Physical Cause Chain Visualizer */}
      <CauseChain />

      {/* Multi-Horizon Predictive Forecast Envelopes & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Forecast Horizon Selector & Readout */}
        <section className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border mb-3 gap-2">
              <div>
                <h3 className="font-heading text-sm font-semibold text-ink">
                  Forward Production Forecast & Multi-Horizon Envelopes
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Extrapolating current cooling decay trajectory to future production cutoffs
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5 shrink-0 self-start sm:self-auto">
                {(['24h', '72h', '7d', '90d'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHorizon(h)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      selectedHorizon === h
                        ? 'bg-petroleum text-white shadow-sm'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {h.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Horizon Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
                <span className="text-[10px] uppercase font-semibold text-ink-muted block font-sans">
                  Forecast Net Oil Rate
                </span>
                <span className="text-xl font-bold text-ink mt-1 block">
                  {horizonData.forecastOilRate} <span className="text-xs text-ink-muted font-normal">BOPD</span>
                </span>
                <span className="text-[11px] text-status-warn mt-0.5 block">
                  {horizonData.oilDeltaPct}% (P10: {horizonData.upperP10} / P90: {horizonData.lowerP90})
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
                <span className="text-[10px] uppercase font-semibold text-ink-muted block font-sans">
                  Reservoir BHT Cooling
                </span>
                <span className="text-xl font-bold text-ink mt-1 block">
                  {horizonData.bhtForecast} <span className="text-xs text-ink-muted font-normal">°C</span>
                </span>
                <span className="text-[11px] text-status-warn mt-0.5 block">
                  {horizonData.bhtDelta} °C ({horizonData.coolingRate} °C/h)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
                <span className="text-[10px] uppercase font-semibold text-ink-muted block font-sans">
                  Lift Motor Power Draw
                </span>
                <span className="text-xl font-bold text-ink mt-1 block">
                  {horizonData.liftMotorPower} <span className="text-xs text-ink-muted font-normal">kW</span>
                </span>
                <span className="text-[11px] text-status-crit mt-0.5 block">
                  +{horizonData.motorPowerDelta} kW (drag escalation)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-secondary border border-border-subtle">
                <span className="text-[10px] uppercase font-semibold text-ink-muted block font-sans">
                  Oil–Steam Ratio (OSR)
                </span>
                <span className="text-xl font-bold text-status-green mt-1 block">
                  {horizonData.oilSteamRatio} <span className="text-xs text-ink-muted font-normal">m³/t</span>
                </span>
                <span className="text-[11px] text-status-green mt-0.5 block">
                  Above economic limit (0.18 floor)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
            <span className="text-ink-secondary">Horizon: <strong className="text-ink">{horizonData.label}</strong></span>
            <button
              type="button"
              onClick={() => navigate('/recommendations')}
              className="text-petroleum hover:underline font-semibold flex items-center gap-1"
            >
              <span>Execute Mitigation Plan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>

        {/* Right: SHAP Feature Importance Ranking */}
        <section className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-border mb-3">
              <h3 className="font-heading text-sm font-semibold text-ink">
                Physics Gradient Feature Importance (SHAP)
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Relative contribution to active production deficit
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {insight.featureImportance.map((feat, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-ink">{feat.featureName}</span>
                    <span className="font-mono font-semibold text-ink">{feat.importancePct} %</span>
                  </div>
                  <div className="h-2 w-full bg-canvas-subtle rounded overflow-hidden">
                    <div
                      className="h-full rounded bg-petroleum transition-all duration-300"
                      style={{ width: `${feat.importancePct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-muted mt-0.5 block">
                    Subsystem: {feat.subsystem}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-ink-secondary">
            <strong>Conclusion:</strong> Thermal conduction (44%) and sucker rod fillage (28%) represent 72% of the variance. Trimming pump speed directly addresses the fillage deficit.
          </div>
        </section>
      </div>
    </div>
  );
};


export default AiInsightsPage;
