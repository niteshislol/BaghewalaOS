import React, { useMemo, useState } from 'react';
import { DataProvenanceBadge } from '../ui/DataProvenanceBadge';
import { Activity, Sparkles } from 'lucide-react';

interface DynamometerChartProps {
  twin: any;
  className?: string;
}

const pointPath = (points: any[], xMax: number, yMin: number, yMax: number) => {
  const x = (v: number) => 70 + (v / Math.max(xMax, 0.1)) * 1070;
  const y = (v: number) => 350 - ((v - yMin) / Math.max(yMax - yMin, 1e-6)) * 312;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(Number(p.position_m || 0)).toFixed(1)} ${y(Number(p.load_n || 0) / 1000).toFixed(1)}`).join(' ');
};

export const DynamometerChart: React.FC<DynamometerChartProps> = ({ twin, className = '' }) => {
  const [showSurface, setShowSurface] = useState(true);
  const [showDownhole, setShowDownhole] = useState(true);
  const surface = twin?.surface_card || [];
  const downhole = twin?.downhole_card || [];
  const allLoads = [...surface, ...downhole].map((p: any) => Number(p.load_n || 0) / 1000);
  const xMax = Math.max(...surface.map((p: any) => Number(p.position_m || 0)), Number(twin?.stroke_m || 0), 1);
  const rawMax = Math.max(...allLoads, 1);
  const rawMin = Math.min(...allLoads, 0);
  const yMax = Math.ceil(Math.max(rawMax * 1.15, 20) / 10) * 10;
  const yMin = Math.floor(Math.min(rawMin * 1.15, 0) / 10) * 10;
  const surfacePath = useMemo(() => pointPath(surface, xMax, yMin, yMax), [surface, xMax, yMin, yMax]);
  const downholePath = useMemo(() => pointPath(downhole, xMax, yMin, yMax), [downhole, xMax, yMin, yMax]);
  const peak = surface.length ? Math.max(...surface.map((p: any) => Number(p.load_n || 0))) / 1000 : null;
  const min = surface.length ? Math.min(...surface.map((p: any) => Number(p.load_n || 0))) / 1000 : null;
  const stroke = Number(twin?.stroke_m || 0);
  const classification = twin?.rod_floating ? 'Rod float signature' : Number(twin?.impact_index || 0) > 0.35 ? 'Impact-loaded cycle' : 'Normal load loop';

  const prompt = `Explain the current SRP dynamometer card for ${twin?.css_cycle_id || 'the current cycle'}. Peak load is ${peak?.toFixed(1) || '—'} kN, minimum load is ${min?.toFixed(1) || '—'} kN, fillage is ${((twin?.fillage || 0) * 100).toFixed(1)}%, and rod float risk is ${((twin?.rod_float_probability || 0) * 100).toFixed(1)}%.`;

  return (
    <div className={`bg-surface border border-border rounded-xl p-5 shadow-subtle flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading text-base font-semibold text-ink">Full-Cycle Dynamometer Load Card</h3>
            <DataProvenanceBadge type="SYNTHETIC" size="sm" />
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-secondary border border-border text-ink-secondary">{classification}</span>
          </div>
          <p className="text-xs text-ink-secondary mt-1">96-step WagheraOS mechanical solution projected to the surface and downhole pump cards.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setShowSurface(v => !v)} className={`px-2.5 py-1 rounded border text-xs font-medium ${showSurface ? 'bg-petroleum text-white border-petroleum' : 'border-border text-ink-muted'}`}>Surface</button>
          <button type="button" onClick={() => setShowDownhole(v => !v)} className={`px-2.5 py-1 rounded border text-xs font-medium ${showDownhole ? 'bg-status-info text-white border-status-info' : 'border-border text-ink-muted'}`}>Downhole</button>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('baghewala:copilot', { detail: { prompt } }))} className="h-7 px-2.5 rounded-lg bg-surface border border-petroleum/30 text-petroleum text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />Explain
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <MiniStat label="Stroke" value={`${stroke.toFixed(2)} m`} />
        <MiniStat label="SPM" value={`${Number(twin?.spm || 0).toFixed(2)}`} />
        <MiniStat label="Peak load" value={peak == null ? '—' : `${peak.toFixed(1)} kN`} />
        <MiniStat label="Min load" value={min == null ? '—' : `${min.toFixed(1)} kN`} />
        <MiniStat label="Fillage" value={`${(Number(twin?.fillage || 0) * 100).toFixed(1)}%`} />
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 1200 410" className="w-full h-auto min-w-[700px] select-none" role="img" aria-label="Live SRP dynamometer load card">
          <rect x="70" y="38" width="1070" height="312" rx="4" fill="var(--canvas-subtle)" opacity="0.4" />
          {[yMin, (yMin + yMax) / 2, yMax].map((v) => {
            const y = 350 - ((v - yMin) / Math.max(yMax - yMin, 1e-6)) * 312;
            return <g key={v}><line x1="70" y1={y} x2="1140" y2={y} className="stroke-border-subtle" /><text x="60" y={y} textAnchor="end" dominantBaseline="middle" className="font-mono text-[10px] fill-ink-muted">{v.toFixed(0)}</text></g>;
          })}
          {[0, xMax / 2, xMax].map((v) => {
            const x = 70 + (v / Math.max(xMax, 0.1)) * 1070;
            return <g key={v}><line x1={x} y1="38" x2={x} y2="350" className="stroke-border-subtle" /><text x={x} y="368" textAnchor="middle" className="font-mono text-[10px] fill-ink-muted">{v.toFixed(2)}</text></g>;
          })}
          {showSurface && <path d={surfacePath} fill="none" stroke="var(--petroleum)" strokeWidth="2.2" />}
          {showDownhole && <path d={downholePath} fill="none" stroke="var(--status-info)" strokeWidth="2" opacity="0.9" />}
          <text x="70" y="25" className="font-mono text-[10.5px] font-semibold tracking-wider uppercase fill-ink-muted">Polished Rod Load (kN)</text>
          <text x="600" y="402" textAnchor="middle" className="font-mono text-[10.5px] fill-ink-muted">Polished Rod Position (m)</text>
        </svg>
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-muted flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-petroleum" />Surface card</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-status-info" />Downhole pump card</span>
        <span className="ml-auto flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{surface.length ? `${surface.length} solved points` : 'No card data'}</span>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md bg-surface-secondary/60 border border-border-subtle px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div><div className="font-mono font-bold text-ink mt-0.5">{value}</div></div>
);

export default DynamometerChart;
