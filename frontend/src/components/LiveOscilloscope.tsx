import React, { useEffect, useRef, useState } from 'react';
import type { OscilloscopeFrame, RealTimeTelemetry } from '../types';
import { Activity, Gauge, Pause, Play, Sliders, Zap } from 'lucide-react';

interface LiveOscilloscopeProps {
  telemetry: RealTimeTelemetry;
  buffer: OscilloscopeFrame[];
}

export const LiveOscilloscope: React.FC<LiveOscilloscopeProps> = ({ telemetry, buffer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeChannel, setActiveChannel] = useState<'LOAD' | 'ELECTRICAL' | 'PRESSURE' | 'FLUID_LEVEL'>('LOAD');
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [timebaseScale, setTimebaseScale] = useState<number>(1); // 1x, 2x, 5x

  useEffect(() => {
    if (isFrozen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear Canvas
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    // Oscilloscope Reticle Grid
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.1)';
    ctx.lineWidth = 1;

    // Vertical divisions (10 divisions)
    const gridCols = 10;
    const colWidth = width / gridCols;
    for (let i = 0; i <= gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * colWidth, 0);
      ctx.lineTo(i * colWidth, height);
      ctx.stroke();

      // Sub-ticks
      for (let j = 0; j < 5; j++) {
        const subX = i * colWidth + (j * colWidth) / 5;
        ctx.strokeStyle = 'rgba(255, 122, 0, 0.04)';
        ctx.beginPath();
        ctx.moveTo(subX, height / 2 - 4);
        ctx.lineTo(subX, height / 2 + 4);
        ctx.stroke();
      }
    }

    // Horizontal divisions (8 divisions)
    const gridRows = 8;
    const rowHeight = height / gridRows;
    for (let i = 0; i <= gridRows; i++) {
      ctx.strokeStyle = i === gridRows / 2 ? 'rgba(255, 122, 0, 0.3)' : 'rgba(255, 122, 0, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, i * rowHeight);
      ctx.lineTo(width, i * rowHeight);
      ctx.stroke();
    }

    // Data points to draw
    const frames = buffer.slice(-Math.floor(100 / timebaseScale));
    if (frames.length < 2) return;

    // Determine scale based on channel
    let minY = 0;
    let maxY = 10000;
    let unit = 'lbs';
    let traceColor = '#ff7a00';
    let glowColor = 'rgba(255, 122, 0, 0.5)';

    if (activeChannel === 'LOAD') {
      minY = 0;
      maxY = 14000;
      unit = 'lbs';
      traceColor = telemetry.rodFloatingDetected ? '#ff2d55' : '#ff7a00';
      glowColor = telemetry.rodFloatingDetected ? 'rgba(255, 45, 85, 0.5)' : 'rgba(255, 122, 0, 0.5)';
    } else if (activeChannel === 'ELECTRICAL') {
      minY = 0;
      maxY = 60; // Amps
      unit = 'Amps';
      traceColor = '#ffb800';
      glowColor = 'rgba(255, 184, 0, 0.4)';
    } else if (activeChannel === 'PRESSURE') {
      minY = 0;
      maxY = 160; // Bar
      unit = 'bar';
      traceColor = '#00ff88';
      glowColor = 'rgba(0, 255, 136, 0.4)';
    } else if (activeChannel === 'FLUID_LEVEL') {
      minY = 400;
      maxY = 1200; // Meters
      unit = 'm';
      traceColor = '#c084fc';
      glowColor = 'rgba(192, 132, 252, 0.4)';
    }

    const mapValToY = (val: number) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      const norm = (clamped - minY) / (maxY - minY);
      return height - 20 - norm * (height - 40);
    };

    const getChannelVal = (f: OscilloscopeFrame) => {
      switch (activeChannel) {
        case 'LOAD':
          return f.rodLoadLbs;
        case 'ELECTRICAL':
          return f.motorCurrentAmps;
        case 'PRESSURE':
          return f.downholePressureBar;
        case 'FLUID_LEVEL':
          return f.fluidLevelM;
      }
    };

    // Draw phosphor glow trace
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const stepX = width / (frames.length - 1);
    frames.forEach((f, idx) => {
      const x = idx * stepX;
      const y = mapValToY(getChannelVal(f));
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw current sweep head point
    const lastX = (frames.length - 1) * stepX;
    const lastY = mapValToY(getChannelVal(frames[frames.length - 1]));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw Channel HUD overlay inside canvas
    ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`CH1: ${activeChannel} [${unit}]`, 12, 20);
    ctx.fillText(`MAX: ${maxY} ${unit}`, 12, 36);
    ctx.fillText(`MIN: ${minY} ${unit}`, 12, 52);

    ctx.fillStyle = traceColor;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(`LIVE: ${getChannelVal(frames[frames.length - 1])} ${unit}`, width - 170, 22);

    // Sweep line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(lastX, 0);
    ctx.lineTo(lastX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [buffer, activeChannel, isFrozen, timebaseScale, telemetry]);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Oscilloscope Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(0, 240, 255, 0.12)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
            <Activity size={20} color="var(--primary-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              SCADA Real-Time Waveform Oscilloscope
              <span className="badge badge-cyan font-mono" style={{ fontSize: '0.7rem' }}>
                LIVE 50 Hz
              </span>
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Continuous digital-twin wave telemetry • live simulation stream
            </p>
          </div>
        </div>

        {/* Channel Selection Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(7, 11, 18, 0.7)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveChannel('LOAD')}
            className={`tab-btn-mini ${activeChannel === 'LOAD' ? 'active-cyan' : ''}`}
          >
            <Activity size={14} /> Rod Tension
          </button>
          <button
            onClick={() => setActiveChannel('ELECTRICAL')}
            className={`tab-btn-mini ${activeChannel === 'ELECTRICAL' ? 'active-amber' : ''}`}
          >
            <Zap size={14} /> Motor Power
          </button>
          <button
            onClick={() => setActiveChannel('PRESSURE')}
            className={`tab-btn-mini ${activeChannel === 'PRESSURE' ? 'active-emerald' : ''}`}
          >
            <Gauge size={14} /> Pressure
          </button>
          <button
            onClick={() => setActiveChannel('FLUID_LEVEL')}
            className={`tab-btn-mini ${activeChannel === 'FLUID_LEVEL' ? 'active-purple' : ''}`}
          >
            <Sliders size={14} /> Fluid Level
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.25)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={260}
          style={{ width: '100%', height: '260px', display: 'block', background: '#060a12' }}
        />

        {/* Floating Controls inside viewport bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(7, 11, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIMEBASE:</span>
          <button
            onClick={() => setTimebaseScale(1)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              background: timebaseScale === 1 ? 'var(--primary-cyan)' : 'transparent',
              color: timebaseScale === 1 ? '#000' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            1X
          </button>
          <button
            onClick={() => setTimebaseScale(2)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              background: timebaseScale === 2 ? 'var(--primary-cyan)' : 'transparent',
              color: timebaseScale === 2 ? '#000' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            2X
          </button>
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: isFrozen ? 'var(--accent-rose)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            {isFrozen ? <Play size={12} /> : <Pause size={12} />}
            {isFrozen ? 'RESUME' : 'HOLD'}
          </button>
        </div>
      </div>

      {/* Bottom Channel Diagnostics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INSTANTANEOUS LOAD</div>
          <div className="font-mono glow-text-cyan" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {telemetry.instantaneousRodLoad.toLocaleString()} lbs
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            Peak: {telemetry.polishedRodPeakLoad} | Min: {telemetry.polishedRodMinLoad}
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MOTOR POWER & CURRENT</div>
          <div className="font-mono glow-text-amber" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {telemetry.motorPowerKw} kW ({telemetry.motorCurrentAmps} A)
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>440V 3-Phase 50Hz</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DOWNHOLE PRESSURE</div>
          <div className="font-mono glow-text-emerald" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {telemetry.downholePressureBar} bar
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Casing: {telemetry.casingPressureBar} bar</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACOUSTIC FLUID LEVEL</div>
          <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
            {telemetry.acousticFluidLevelMeters} m
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Subsurface Echo Sounder</div>
        </div>
      </div>
    </div>
  );
};
