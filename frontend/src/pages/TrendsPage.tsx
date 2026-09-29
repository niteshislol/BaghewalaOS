import React, { useState, useEffect } from 'react';
import { LineChart as LucideLineChart, Filter, Calendar, Info, ArrowDown, ArrowUp, GitCompare, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { getTelemetryStats } from '../services/api';

type ComparisonPreset = 'temp_visc' | 'fillage_eff' | 'pred_act' | 'pip_inflow' | 'custom';

export const TrendsPage: React.FC = () => {
  const [comparisonPreset, setComparisonPreset] = useState<ComparisonPreset>('temp_visc');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'cycle'>('cycle');
  const [selectedCycle, setSelectedCycle] = useState<string>('cycle-4');

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTelemetryStats().then(stats => {
      const mockTimeseries = stats.timeseries || {
        days: [], netOil: [], liquid: [], bht: [], viscosity: [], fillage: []
      };
      
      const cutCount = timeRange === '7d' ? 5 : timeRange === '30d' ? 14 : mockTimeseries.days.length;
      const days = mockTimeseries.days.slice(-cutCount);
      const netOil = mockTimeseries.netOil.slice(-cutCount);
      const liquid = mockTimeseries.liquid.slice(-cutCount);
      const bht = mockTimeseries.bht.slice(-cutCount);
      const viscosity = mockTimeseries.viscosity.slice(-cutCount);
      const fillage = mockTimeseries.fillage.slice(-cutCount);

      const data = days.map((d: any, i: any) => ({
        day: `Day ${d}`,
        dayNum: d,
        netOil: netOil[i],
        predictedOil: 198.0,
        liquid: liquid[i],
        bht: bht[i],
        viscosity: viscosity[i],
        fillage: fillage[i],
        efficiency: +(fillage[i] * 1.02).toFixed(1),
        pip: +(42.1 - (i * 0.2)).toFixed(1),
        inflow: +(netOil[i] * 1.08).toFixed(1),
      }));
      setChartData(data);
      setLoading(false);
    });
  }, [timeRange]);

  const getPresetConfig = () => {
    switch (comparisonPreset) {
      case 'temp_visc':
        return {
          title: 'Temperature & In-Situ Viscosity Correlation',
          subtitle: 'Thermal energy falloff vs. Andrade exponential viscosity creep',
          leftKey: 'viscosity',
          leftLabel: 'In-Situ Viscosity',
          leftUnit: 'cP',
          leftColor: 'var(--status-warn)',
          leftDomain: [20, 100],
          rightKey: 'bht',
          rightLabel: 'Bottomhole Temp',
          rightUnit: '°C',
          rightColor: 'var(--status-info)',
          rightDomain: [200, 260],
        };
      case 'fillage_eff':
        return {
          title: 'Pump Fillage & Volumetric Efficiency',
          subtitle: 'Chamber liquid starvation vs. downhole kinematic lift efficiency',
          leftKey: 'fillage',
          leftLabel: 'Pump Fillage',
          leftUnit: '%',
          leftColor: 'var(--status-crit)',
          leftDomain: [75, 100],
          rightKey: 'efficiency',
          rightLabel: 'Volumetric Efficiency',
          rightUnit: '%',
          rightColor: 'var(--petroleum)',
          rightDomain: [75, 100],
        };
      case 'pred_act':
        return {
          title: 'Predicted vs. Actual Net Oil Production',
          subtitle: 'Coupled digital twin forecast divergence vs. coriolis fiscal meter',
          leftKey: 'netOil',
          leftLabel: 'Actual Oil Rate',
          leftUnit: 'BOPD',
          leftColor: 'var(--status-warn)',
          leftDomain: [140, 240],
          rightKey: 'predictedOil',
          rightLabel: 'Model Predicted',
          rightUnit: 'BOPD',
          rightColor: 'var(--petroleum)',
          rightDomain: [140, 240],
        };
      case 'pip_inflow':
        return {
          title: 'Pump Intake Pressure (PIP) & Reservoir Inflow',
          subtitle: 'Drawdown pressure differential vs. radial bitumen delivery',
          leftKey: 'pip',
          leftLabel: 'Intake Pressure (PIP)',
          leftUnit: 'bar',
          leftColor: 'var(--status-info)',
          leftDomain: [30, 50],
          rightKey: 'inflow',
          rightLabel: 'Inflow Delivery',
          rightUnit: 'BFPD',
          rightColor: 'var(--status-green)',
          rightDomain: [150, 260],
        };
      default:
        return {
          title: 'Comparative Telemetry Analytics',
          subtitle: 'Multi-parameter correlation',
          leftKey: 'netOil',
          leftLabel: 'Net Oil',
          leftUnit: 'BOPD',
          leftColor: 'var(--status-warn)',
          leftDomain: [140, 240],
          rightKey: 'bht',
          rightLabel: 'BHT',
          rightUnit: '°C',
          rightColor: 'var(--status-info)',
          rightDomain: [200, 260],
        };
    }
  };

  const currentCfg = getPresetConfig();

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Telemetry Trends & Subsurface Cross-Correlation"
        subtitle="Multi-parameter correlation analysis comparing thermal decay, fluid viscosity shifts, artificial-lift fillage, and model divergence."
      />

      {/* Preset Comparisons & Filtering Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted uppercase mr-1">Compare:</span>
          {[
            { id: 'temp_visc', label: 'Temp + Viscosity' },
            { id: 'fillage_eff', label: 'Fillage + Efficiency' },
            { id: 'pred_act', label: 'Predicted + Actual' },
            { id: 'pip_inflow', label: 'Intake Pres + Inflow' },
          ].map((preset) => {
            const isSelected = comparisonPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setComparisonPreset(preset.id as ComparisonPreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isSelected
                    ? 'bg-surface text-ink border-petroleum shadow-sm'
                    : 'bg-surface-secondary text-ink-secondary border-border hover:text-ink'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-petroleum" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time Range & Cycle Selector */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {/* CSS Cycle Selector */}
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-surface text-ink text-xs font-mono font-medium focus:outline-none focus:border-petroleum"
          >
            <option value="cycle-4">CSS Cycle 4 (Active)</option>
            <option value="cycle-3">CSS Cycle 3 (Historical)</option>
            <option value="cycle-2">CSS Cycle 2 (Historical)</option>
            <option value="cycle-1">CSS Cycle 1 (Baseline)</option>
          </select>

          {/* Time Range Switcher */}
          <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                timeRange === '7d' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                timeRange === '30d' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('cycle')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                timeRange === 'cycle' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              Full Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Primary Comparative Trend Chart with Dual Axis */}
      <section className="bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border mb-3 gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-ink flex items-center gap-2">
                <span>{currentCfg.title}</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {currentCfg.subtitle} · Well BW-017 CSS Cycle 4
              </p>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs self-start sm:self-auto">
              <span className="flex items-center gap-1 font-semibold" style={{ color: currentCfg.leftColor }}>
                ● {currentCfg.leftLabel} ({currentCfg.leftUnit})
              </span>
              <span className="flex items-center gap-1 font-semibold" style={{ color: currentCfg.rightColor }}>
                -- {currentCfg.rightLabel} ({currentCfg.rightUnit})
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} stroke="var(--border)" />
                {/* Left Y Axis */}
                <YAxis
                  yAxisId="left"
                  domain={currentCfg.leftDomain}
                  unit={` ${currentCfg.leftUnit}`}
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  stroke="var(--border)"
                />
                {/* Right Y Axis */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={currentCfg.rightDomain}
                  unit={` ${currentCfg.rightUnit}`}
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  stroke="var(--border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    color: 'var(--ink)',
                    fontSize: 11,
                    boxShadow: 'var(--shadow-card)',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} ${name === currentCfg.rightKey ? currentCfg.rightUnit : currentCfg.leftUnit}`,
                    name === currentCfg.rightKey ? currentCfg.rightLabel : currentCfg.leftLabel,
                  ]}
                />
                {/* Reference Line for Current Day */}
                <ReferenceLine
                  yAxisId="left"
                  x="Day 38"
                  stroke="var(--status-crit)"
                  strokeDasharray="4 4"
                  label={{ value: 'Day 38 (Today)', fill: 'var(--status-crit)', fontSize: 10 }}
                />
                {/* Left Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={currentCfg.leftKey}
                  stroke={currentCfg.leftColor}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: currentCfg.leftColor }}
                  name={currentCfg.leftKey}
                />
                {/* Right Line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={currentCfg.rightKey}
                  stroke={currentCfg.rightColor}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  name={currentCfg.rightKey}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-secondary gap-2">
          <span>Physical Correlation: As BHT drops at -0.04°C/h, in-situ viscosity rises toward 84 cP, inducing pump fillage reduction and surface production deficit.</span>
          <span className="font-mono text-petroleum font-semibold">Pearson Correlation: r = −0.94</span>
        </div>
      </section>

      {/* Cycle 4 Changes Attribution Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">Net Oil Rate</span>
            <DataProvenanceBadge type="ACTUAL" size="sm" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-mono text-lg font-bold text-ink">310 → 184.2</span>
            <span className="font-mono text-xs font-semibold text-status-warn">−40.6 %</span>
          </div>
          <span className="text-[11px] text-ink-muted mt-1 leading-snug">Natural post-flush decline curve.</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">Bottomhole Temp</span>
            <DataProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-mono text-lg font-bold text-ink">248.5 → 214.8</span>
            <span className="font-mono text-xs font-semibold text-status-warn">−33.7 °C</span>
          </div>
          <span className="text-[11px] text-ink-muted mt-1 leading-snug">Conductive loss to bounding shale.</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">Water Cut</span>
            <DataProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-mono text-lg font-bold text-ink">22.0 → 42.4</span>
            <span className="font-mono text-xs font-semibold text-status-info">+20.4 pt</span>
          </div>
          <span className="text-[11px] text-ink-muted mt-1 leading-snug">Steam condensate return, expected.</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col justify-between border-l-4 border-l-status-crit">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-status-crit uppercase tracking-wider">Pump Fillage</span>
            <DataProvenanceBadge type="ACTUAL" size="sm" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-mono text-lg font-bold text-status-crit">88.2 → 84.6</span>
            <span className="font-mono text-xs font-semibold text-status-crit">−3.6 pt</span>
          </div>
          <span className="text-[11px] text-status-crit font-medium mt-1 leading-snug">Off-curve anomaly: fluid pound onset.</span>
        </div>
      </div>
    </div>
  );
};


export default TrendsPage;
