import React from 'react';
import type { OptimizationResult, RealTimeTelemetry } from '../types';
import { DollarSign, Download } from 'lucide-react';

interface EconomicProps {
  telemetry: RealTimeTelemetry;
  optimizationResult: OptimizationResult;
}

export const EconomicDashboard: React.FC<EconomicProps> = ({ telemetry, optimizationResult }) => {
  const exportExecutiveReport = () => {
    const reportContent = {
      title: 'Baghewala Field Well #BW-07 CSS + SRP Digital Twin Executive Summary',
      generatedAt: new Date().toLocaleString(),
      fieldDetails: {
        field: 'Baghewala Field, Rajasthan',
        reservoir: 'Jodhpur Sandstone',
        apiGravity: '17.5° API Heavy Crude',
        reservoirTemp: '47 °C',
        reservoirPressure: '35 bar',
      },
      currentTelemetry: {
        cycleDay: telemetry.cycleDays,
        bottomHoleTemp: `${telemetry.bottomHoleTemp} °C`,
        viscosity: `${telemetry.viscosity} cP`,
        oilRate: `${telemetry.oilRate} m3/day`,
        netDailyMargin: `$${telemetry.netDailyMargin} / day`,
        steamOilRatio: `${telemetry.steamOilRatio} m3/m3`,
      },
      optimizationImpact: {
        projectedNpvGain: `$${optimizationResult.projectedNpvGain.toLocaleString()}`,
        oilGainPercent: `+${optimizationResult.projectedOilGainPercent}%`,
        sorReductionPercent: `-${optimizationResult.projectedSorReductionPercent}%`,
        energySavingsPercent: `-${optimizationResult.projectedEnergySavingsPercent}%`,
        paybackDays: `${optimizationResult.paybackDays} Days`,
      },
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Baghewala_DigitalTwin_ExecutiveReport_BW07.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Executive Financial Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <DollarSign size={24} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Direct Economic Value & ROI Dashboard</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time OPEX, Crude Revenue, Net Cash Flow & Steam-Oil Ratio (SOR) Economics
            </p>
          </div>

          <button onClick={exportExecutiveReport} className="btn-primary" style={{ gap: '8px' }}>
            <Download size={16} />
            Export Executive Report (JSON)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
            NET DAILY MARGIN
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className="font-mono glow-text-emerald">
            ${telemetry.netDailyMargin.toLocaleString()} / day
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Net crude sales minus steam & power
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
            STEAM-OIL RATIO (SOR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className="font-mono glow-text-cyan">
            {telemetry.steamOilRatio} m³/m³
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            ↓ 28.4% Efficiency Improvement
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
            SPECIFIC ENERGY COST
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className="font-mono">
            ${telemetry.specificEnergyCost} / bbl
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fuel + SRP Electrical Tariff
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
            PROJECTED NET VALUE ADDED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className="font-mono glow-text-emerald">
            +${optimizationResult.projectedNpvGain.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Payback Period: {optimizationResult.paybackDays} Days
          </div>
        </div>
      </div>

      {/* Financial Breakdown Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
          Daily Operational Economic Breakdown (Baghewala Well #BW-07)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Line Item</th>
                <th style={{ padding: '12px' }}>Quantity / Rate</th>
                <th style={{ padding: '12px' }}>Unit Benchmark</th>
                <th style={{ padding: '12px' }}>Daily Value ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>Heavy Oil Gross Revenue</td>
                <td style={{ padding: '12px' }} className="font-mono">{telemetry.oilRate} m³/day ({(telemetry.oilRate * 6.28981).toFixed(1)} bbls/day)</td>
                <td style={{ padding: '12px' }} className="font-mono">$72.00 / bbl</td>
                <td style={{ padding: '12px' }} className="font-mono glow-text-emerald">+${Math.round(telemetry.oilRate * 6.28981 * 72).toLocaleString()}</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>Steam Boiler Fuel Cost (Amortized)</td>
                <td style={{ padding: '12px' }} className="font-mono">2,400 m³ / 60-day cycle</td>
                <td style={{ padding: '12px' }} className="font-mono">$14.50 / m³ steam</td>
                <td style={{ padding: '12px' }} className="font-mono glow-text-rose">-${Math.round((2400 * 14.5) / 60).toLocaleString()}</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>SRP Pumping Electrical Power</td>
                <td style={{ padding: '12px' }} className="font-mono">{(0.8 * telemetry.spm * 24).toFixed(1)} kWh / day ({telemetry.spm} SPM)</td>
                <td style={{ padding: '12px' }} className="font-mono">$0.12 / kWh</td>
                <td style={{ padding: '12px' }} className="font-mono glow-text-rose">-${Math.round(0.8 * telemetry.spm * 24 * 0.12).toLocaleString()}</td>
              </tr>

              <tr>
                <td style={{ padding: '12px', fontWeight: 800 }}>NET DAILY MARGIN</td>
                <td style={{ padding: '12px' }}>—</td>
                <td style={{ padding: '12px' }}>—</td>
                <td style={{ padding: '12px', fontWeight: 800 }} className="font-mono glow-text-emerald">+${telemetry.netDailyMargin.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
