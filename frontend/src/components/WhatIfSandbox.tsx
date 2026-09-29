import React, { useState } from 'react';
import type { CSSParameters, ReservoirParameters, SRPParameters } from '../types';
import { calculateBottomHoleTemp, calculateViscosity, calculateProductionRates } from '../services/physicsEngine';
import { Sliders } from 'lucide-react';

interface WhatIfProps {
  css: CSSParameters;
  srp: SRPParameters;
  res: ReservoirParameters;
}

export const WhatIfSandbox: React.FC<WhatIfProps> = ({ css, srp, res }) => {
  // Baseline parameters (historical experience)
  const [baseSteam, setBaseSteam] = useState<number>(3200);
  const [baseSoak, setBaseSoak] = useState<number>(7);
  const [baseSpm, setBaseSpm] = useState<number>(7.5);

  // Digital Twin parameters
  const [twinSteam, setTwinSteam] = useState<number>(2400);
  const [twinSoak, setTwinSoak] = useState<number>(4);
  const [twinSpm, setTwinSpm] = useState<number>(4.8);

  // Market Economic Factors
  const oilPrice = 72;
  const steamCost = 14.5;
  const powerCost = 0.12;

  // Helper simulation runner for 60 days
  const runSimulation = (steam: number, soak: number, spm: number) => {
    let totalOilM3 = 0;
    let totalPowerCost = 0;

    for (let day = 1; day <= 60; day++) {
      const bht = calculateBottomHoleTemp(day, 'PRODUCTION', { ...css, steamVolume: steam, soakTimeDays: soak }, res);
      const mu = calculateViscosity(bht);
      const rates = calculateProductionRates(mu, { ...srp, spm });

      totalOilM3 += rates.oilRate;
      totalPowerCost += 0.8 * spm * 24 * powerCost;
    }

    const bbls = totalOilM3 * 6.28981;
    const revenue = bbls * oilPrice;
    const totalSteamCost = steam * steamCost;
    const netMargin = revenue - totalSteamCost - totalPowerCost;
    const sor = steam / Math.max(1, totalOilM3);

    return {
      totalOilM3: Math.round(totalOilM3),
      totalOilBbls: Math.round(bbls),
      revenue: Math.round(revenue),
      totalSteamCost: Math.round(totalSteamCost),
      totalPowerCost: Math.round(totalPowerCost),
      netMargin: Math.round(netMargin),
      sor: parseFloat(sor.toFixed(2)),
    };
  };

  const baseResults = runSimulation(baseSteam, baseSoak, baseSpm);
  const twinResults = runSimulation(twinSteam, twinSoak, twinSpm);

  const marginGain = twinResults.netMargin - baseResults.netMargin;
  const oilDiff = twinResults.totalOilM3 - baseResults.totalOilM3;
  const sorDiff = parseFloat((twinResults.sor - baseResults.sor).toFixed(2));
  const fuelSavings = baseResults.totalSteamCost - twinResults.totalSteamCost;

  const formatCurrencyDelta = (val: number) => {
    if (val >= 0) return `+$${val.toLocaleString()}`;
    return `-$${Math.abs(val).toLocaleString()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sliders size={24} color="var(--primary-cyan)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>What-If Scenario Simulation Laboratory</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Compare historical unintegrated operational practice vs Digital Twin AI Integrated Strategy
            </p>
          </div>

          <div
            style={{
              background: marginGain >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              padding: '10px 18px',
              borderRadius: '12px',
              border: `1px solid ${marginGain >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NET STRATEGY MARGIN GAIN</div>
            <div
              style={{ fontSize: '1.25rem', fontWeight: 800 }}
              className={marginGain >= 0 ? 'glow-text-emerald' : 'glow-text-rose'}
            >
              {formatCurrencyDelta(marginGain)} / Cycle
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Scenario Sandbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Scenario 1: Baseline Historical Practice */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Scenario A: Historical Practice</h3>
            <span className="badge badge-amber">Unintegrated</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Steam Volume:</span>
                <span className="font-mono">{baseSteam} m³</span>
              </div>
              <input type="range" min="1500" max="4500" step="100" value={baseSteam} onChange={(e) => setBaseSteam(Number(e.target.value))} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Soak Duration:</span>
                <span className="font-mono">{baseSoak} Days</span>
              </div>
              <input type="range" min="2" max="10" step="1" value={baseSoak} onChange={(e) => setBaseSoak(Number(e.target.value))} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Fixed SRP Speed:</span>
                <span className="font-mono">{baseSpm} SPM</span>
              </div>
              <input type="range" min="3.0" max="9.0" step="0.5" value={baseSpm} onChange={(e) => setBaseSpm(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Scenario 2: Digital Twin AI Strategy */}
        <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>Scenario B: Digital Twin AI Strategy</h3>
            <span className="badge badge-emerald">Integrated Optimization</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Optimal Steam Volume:</span>
                <span className="font-mono glow-text-cyan">{twinSteam} m³</span>
              </div>
              <input type="range" min="1500" max="4500" step="100" value={twinSteam} onChange={(e) => setTwinSteam(Number(e.target.value))} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Optimal Soak Duration:</span>
                <span className="font-mono glow-text-cyan">{twinSoak} Days</span>
              </div>
              <input type="range" min="2" max="10" step="1" value={twinSoak} onChange={(e) => setTwinSoak(Number(e.target.value))} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Dynamic SRP Speed Target:</span>
                <span className="font-mono glow-text-cyan">{twinSpm} SPM</span>
              </div>
              <input type="range" min="3.0" max="9.0" step="0.5" value={twinSpm} onChange={(e) => setTwinSpm(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side Comparative Results Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
          60-Day Cycle Performance Comparison Matrix
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Performance Indicator</th>
                <th style={{ padding: '12px' }}>Scenario A (Historical)</th>
                <th style={{ padding: '12px' }}>Scenario B (Digital Twin)</th>
                <th style={{ padding: '12px' }}>Delta / Net Benefit</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>Cumulative Oil Produced</td>
                <td style={{ padding: '12px' }} className="font-mono">{baseResults.totalOilM3} m³ ({baseResults.totalOilBbls} bbls)</td>
                <td style={{ padding: '12px' }} className="font-mono glow-text-cyan">{twinResults.totalOilM3} m³ ({twinResults.totalOilBbls} bbls)</td>
                <td style={{ padding: '12px' }} className={`font-mono ${oilDiff >= 0 ? 'glow-text-emerald' : 'glow-text-rose'}`}>
                  {oilDiff >= 0 ? `+${oilDiff} m³` : `${oilDiff} m³`}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>Steam-Oil Ratio (SOR)</td>
                <td style={{ padding: '12px' }} className="font-mono">{baseResults.sor} m³/m³</td>
                <td style={{ padding: '12px' }} className="font-mono glow-text-cyan">{twinResults.sor} m³/m³</td>
                <td style={{ padding: '12px' }} className={`font-mono ${sorDiff <= 0 ? 'glow-text-emerald' : 'glow-text-rose'}`}>
                  {sorDiff <= 0 ? `${sorDiff} m³/m³ (${Math.round((sorDiff / baseResults.sor) * 100)}%)` : `+${sorDiff} m³/m³ (+${Math.round((sorDiff / baseResults.sor) * 100)}%)`}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>Steam Boiler Fuel Expense</td>
                <td style={{ padding: '12px' }} className="font-mono">${baseResults.totalSteamCost.toLocaleString()}</td>
                <td style={{ padding: '12px' }} className="font-mono">${twinResults.totalSteamCost.toLocaleString()}</td>
                <td style={{ padding: '12px' }} className={`font-mono ${fuelSavings >= 0 ? 'glow-text-emerald' : 'glow-text-rose'}`}>
                  {formatCurrencyDelta(-fuelSavings)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '12px', fontWeight: 700 }}>Net Cash Margin ($)</td>
                <td style={{ padding: '12px', fontWeight: 700 }} className="font-mono">${baseResults.netMargin.toLocaleString()}</td>
                <td style={{ padding: '12px', fontWeight: 700 }} className="font-mono glow-text-emerald">${twinResults.netMargin.toLocaleString()}</td>
                <td style={{ padding: '12px', fontWeight: 800 }} className={`font-mono ${marginGain >= 0 ? 'glow-text-emerald' : 'glow-text-rose'}`}>
                  {formatCurrencyDelta(marginGain)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
