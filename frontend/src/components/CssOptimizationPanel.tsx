import React from 'react';
import type { CSSParameters, OptimizationResult, RealTimeTelemetry, ReservoirParameters } from '../types';
import { calculateBottomHoleTemp, calculateViscosity } from '../services/physicsEngine';
import { Flame, CheckCircle, Sliders, ArrowRight } from 'lucide-react';

interface CssPanelProps {
  css: CSSParameters;
  setCss: React.Dispatch<React.SetStateAction<CSSParameters>>;
  res: ReservoirParameters;
  telemetry: RealTimeTelemetry;
  optimizationResult: OptimizationResult;
}

export const CssOptimizationPanel: React.FC<CssPanelProps> = ({
  css,
  setCss,
  res,
  optimizationResult,
}) => {
  // Generate thermal decay points over 60 days
  const days = Array.from({ length: 30 }, (_, i) => (i + 1) * 2);
  const thermalData = days.map((d) => {
    const temp = calculateBottomHoleTemp(d, 'PRODUCTION', css, res);
    const visc = calculateViscosity(temp);
    return { day: d, temp, visc };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Flame size={24} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Cyclic Steam Stimulation (CSS) Thermal Optimizer</h2>
              <span className="badge badge-amber">Cycle #{css.cycleNumber} Active</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Physics-Informed Thermal Reservoir Heat Decay & Viscosity Reduction Solver for Jodhpur Sandstone
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PROJECTED SOR REDUCTION</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                -{optimizationResult.projectedSorReductionPercent}%
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OIL YIELD IMPROVEMENT</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-cyan)' }}>
                +{optimizationResult.projectedOilGainPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters & AI Optimization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Current CSS Injection Parameters */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--primary-cyan)" />
            Current Cycle Injection Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Steam Injection Volume</span>
                <span className="font-mono glow-text-cyan" style={{ fontWeight: 700 }}>
                  {css.steamVolume} m³ CWE
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="4500"
                step="100"
                value={css.steamVolume}
                onChange={(e) => setCss({ ...css, steamVolume: Number(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Soak Period Duration</span>
                <span className="font-mono glow-text-cyan" style={{ fontWeight: 700 }}>
                  {css.soakTimeDays} Days
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={css.soakTimeDays}
                onChange={(e) => setCss({ ...css, soakTimeDays: Number(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Production Cut-Off Threshold</span>
                <span className="font-mono glow-text-cyan" style={{ fontWeight: 700 }}>
                  {css.productionCutoffRate} m³/day
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.5"
                value={css.productionCutoffRate}
                onChange={(e) => setCss({ ...css, productionCutoffRate: Number(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Injection Steam Quality / Temp</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {css.injectionTemp} °C @ {css.injectionPressure} bar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Optimized Recommended Strategy */}
        <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)' }}>
            <CheckCircle size={18} />
            AI Digital Twin Recommended Target
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimal Steam Volume</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {optimizationResult.recommendedSteamVolume} m³
                </div>
              </div>
              <span className="badge badge-emerald">Save {css.steamVolume - optimizationResult.recommendedSteamVolume} m³</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimal Soak Days</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {optimizationResult.recommendedSoakDays} Days
                </div>
              </div>
              <span className="badge badge-cyan">Thermal Equilibrium</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cycle Cut-off Point</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {optimizationResult.recommendedCutoffRate} m³/day
                </div>
              </div>
              <span className="badge badge-amber">Prevents Inefficient SRP Run</span>
            </div>

            <button
              onClick={() =>
                setCss({
                  ...css,
                  steamVolume: optimizationResult.recommendedSteamVolume,
                  soakTimeDays: optimizationResult.recommendedSoakDays,
                  productionCutoffRate: optimizationResult.recommendedCutoffRate,
                })
              }
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            >
              Apply AI Recommendation <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Graphs: Temperature Decay & Viscosity Trajectory */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
          Simulated Thermal Reservoir Decay & Viscosity Recovery Trajectory
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Temperature Curve */}
          <div style={{ background: 'rgba(9, 13, 22, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
              Bottom Hole Temperature Decay (°C vs Days)
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px' }}>
              {thermalData.map((d) => {
                const heightPct = Math.min(100, Math.max(10, ((d.temp - 40) / 250) * 100));
                return (
                  <div
                    key={d.day}
                    style={{
                      flex: 1,
                      height: `${heightPct}%`,
                      background: 'linear-gradient(0deg, #f59e0b, #f43f5e)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`Day ${d.day}: ${d.temp.toFixed(1)} °C`}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              <span>Day 1</span>
              <span>Day 30</span>
              <span>Day 60</span>
            </div>
          </div>

          {/* Viscosity Curve */}
          <div style={{ background: 'rgba(9, 13, 22, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
              Crude Viscosity Recovery (cP vs Days)
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px' }}>
              {thermalData.map((d) => {
                const heightPct = Math.min(100, Math.max(8, (d.visc / 3500) * 100));
                return (
                  <div
                    key={d.day}
                    style={{
                      flex: 1,
                      height: `${heightPct}%`,
                      background: 'linear-gradient(0deg, #0284c7, #38bdf8)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`Day ${d.day}: ${d.visc.toFixed(0)} cP`}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              <span>Day 1 (18 cP)</span>
              <span>Day 30 (1200 cP)</span>
              <span>Day 60 (3200 cP)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
