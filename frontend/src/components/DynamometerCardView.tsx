import React, { useEffect, useRef, useState } from 'react';
import type { DynamometerCardData, RealTimeTelemetry, SRPParameters } from '../types';
import { generateDynamometerCard } from '../services/physicsEngine';
import { Activity, AlertTriangle } from 'lucide-react';

interface DynamometerProps {
  telemetry: RealTimeTelemetry;
  srp: SRPParameters;
}

export const DynamometerCardView: React.FC<DynamometerProps> = ({ telemetry, srp }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<'AUTO' | 'ROD_FLOATING' | 'FLUID_POUND' | 'NORMAL' | 'GAS_INTERFERENCE' | 'LEAKAGE'>('AUTO');
  const [showDownholeCard, setShowDownholeCard] = useState<boolean>(true);
  const [showGhostCard, setShowGhostCard] = useState<boolean>(true);

  const cardData: DynamometerCardData = generateDynamometerCard(
    telemetry.viscosity,
    srp,
    selectedAnomaly === 'AUTO' ? undefined : selectedAnomaly
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, width, height);

    // Reticle Grid
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.08)';
    ctx.lineWidth = 1;
    const padL = 60;
    const padR = 30;
    const padT = 30;
    const padB = 50;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Grid lines
    for (let x = 0; x <= 10; x++) {
      const gx = padL + (x * plotW) / 10;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, padT + plotH);
      ctx.stroke();
    }
    for (let y = 0; y <= 8; y++) {
      const gy = padT + (y * plotH) / 8;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('0"', padL - 8, padT + plotH + 20);
    ctx.fillText(`${srp.strokeLength}"`, padL + plotW - 15, padT + plotH + 20);
    ctx.fillText('POLISHED ROD POSITION (INCHES)', padL + plotW / 2 - 100, padT + plotH + 35);

    // Y Axis (Loads: 0 to 14,000 lbs)
    const maxScaleLoad = 14000;
    for (let i = 0; i <= 7; i++) {
      const val = (i * 2000);
      const ly = padT + plotH - (val / maxScaleLoad) * plotH;
      ctx.fillText(`${val}`, 8, ly + 4);
    }
    ctx.save();
    ctx.translate(16, padT + plotH / 2 + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('POLISHED ROD LOAD (LBS)', 0, 0);
    ctx.restore();

    // Map functions
    const mapX = (posInches: number) => padL + (posInches / srp.strokeLength) * plotW;
    const mapY = (loadLbs: number) => padT + plotH - (loadLbs / maxScaleLoad) * plotH;

    // 1. Ghost / Reference Ideal Card (Normal 100% Fillage)
    if (showGhostCard) {
      const idealCard = generateDynamometerCard(25, srp, 'NORMAL');
      if (idealCard.surfacePoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(mapX(idealCard.surfacePoints[0].position), mapY(idealCard.surfacePoints[0].surfaceLoad));
        for (let i = 1; i < idealCard.surfacePoints.length; i++) {
          ctx.lineTo(mapX(idealCard.surfacePoints[i].position), mapY(idealCard.surfacePoints[i].surfaceLoad));
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.25)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Downhole Pump Card Loop (inner shape)
    if (showDownholeCard && cardData.downholePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(mapX(cardData.downholePoints[0].position), mapY(cardData.downholePoints[0].downholeLoad));
      for (let i = 1; i < cardData.downholePoints.length; i++) {
        ctx.lineTo(mapX(cardData.downholePoints[i].position), mapY(cardData.downholePoints[i].downholeLoad));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 3. Render Surface Dynamometer Card Loop
    if (cardData.surfacePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(mapX(cardData.surfacePoints[0].position), mapY(cardData.surfacePoints[0].surfaceLoad));

      for (let i = 1; i < cardData.surfacePoints.length; i++) {
        ctx.lineTo(mapX(cardData.surfacePoints[i].position), mapY(cardData.surfacePoints[i].surfaceLoad));
      }
      ctx.closePath();

      // Card color based on anomaly
      let strokeColor = '#ff7a00'; // Cyber Orange
      let fillColor = 'rgba(255, 122, 0, 0.15)';
      if (cardData.anomalyType === 'ROD_FLOATING') {
        strokeColor = '#ff2d55'; // Crimson
        fillColor = 'rgba(255, 45, 85, 0.15)';
      } else if (cardData.anomalyType === 'FLUID_POUND') {
        strokeColor = '#ffb800'; // Amber
        fillColor = 'rgba(255, 184, 0, 0.15)';
      }

      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4. Real-Time Laser Tracing Point on Surface Card!
    const livePos = telemetry.instantaneousRodPosition;
    const liveLoad = telemetry.instantaneousRodLoad;
    const laserX = mapX(livePos);
    const laserY = mapY(liveLoad);

    // Laser crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(laserX, padT);
    ctx.lineTo(laserX, padT + plotH);
    ctx.moveTo(padL, laserY);
    ctx.lineTo(padL + plotW, laserY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing Laser Dot
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(laserX, laserY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Laser pulse outer ring
    ctx.strokeStyle = telemetry.rodFloatingDetected ? '#ff2d55' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(laserX, laserY, 11, 0, Math.PI * 2);
    ctx.stroke();
  }, [cardData, srp, telemetry, showDownholeCard, showGhostCard]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
      {/* Canvas Plot Column */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--primary-cyan)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Real-Time Dynamometer Card Diagnostics</h2>
              <span className="badge badge-cyan font-mono" style={{ fontSize: '0.7rem' }}>
                LIVE TRACING
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Continuous Load vs Displacement wave telemetry synchronized with pump stroke position
            </p>
          </div>

          {/* Overlays toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowDownholeCard(!showDownholeCard)}
              className={`tab-btn-mini ${showDownholeCard ? 'active-emerald' : ''}`}
            >
              Downhole Pump Card
            </button>
            <button
              onClick={() => setShowGhostCard(!showGhostCard)}
              className={`tab-btn-mini ${showGhostCard ? 'active-cyan' : ''}`}
            >
              Ghost Reference
            </button>
          </div>
        </div>

        {/* Dynamometer Canvas */}
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
          <canvas
            ref={canvasRef}
            width={720}
            height={460}
            style={{ width: '100%', height: '460px', display: 'block', background: '#060a12' }}
          />

          {/* Canvas Live HUD overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(7, 11, 18, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE LASER TRACKER</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono glow-text-cyan" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {telemetry.instantaneousRodPosition}" @ {telemetry.instantaneousRodLoad.toLocaleString()} lbs
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Speed: <strong style={{ color: '#fff' }}>{telemetry.spm} SPM</strong> | Stroke: <strong style={{ color: '#fff' }}>{srp.strokeLength}"</strong>
            </div>
          </div>
        </div>

        {/* Anomaly Pattern Simulation Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CARD SCENARIO:</span>
          {(['AUTO', 'ROD_FLOATING', 'FLUID_POUND', 'NORMAL', 'GAS_INTERFERENCE', 'LEAKAGE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedAnomaly(type)}
              className={`tab-btn-mini ${selectedAnomaly === type ? 'active-cyan' : ''}`}
              style={{ fontSize: '0.7rem' }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostics & AI Anomaly Recognition Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Classification Card */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            borderColor: cardData.anomalyType === 'ROD_FLOATING' ? 'rgba(255, 45, 85, 0.5)' : 'rgba(0, 255, 136, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>AI CLASSIFICATION</span>
            <span
              className={`badge ${
                cardData.anomalyType === 'ROD_FLOATING'
                  ? 'badge-rose'
                  : cardData.anomalyType === 'FLUID_POUND'
                  ? 'badge-amber'
                  : 'badge-emerald'
              }`}
            >
              {cardData.confidence}% MATCH
            </span>
          </div>

          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }} className={cardData.anomalyType === 'ROD_FLOATING' ? 'glow-text-rose' : 'glow-text-emerald'}>
            {cardData.anomalyType.replace('_', ' ')}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {cardData.cardDescription}
          </p>
        </div>

        {/* Load Summary Matrix */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Polished Rod Mechanical Loads
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Peak Polished Rod Load (PPRL)</span>
            <span className="font-mono glow-text-cyan" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {telemetry.polishedRodPeakLoad.toLocaleString()} lbs
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Min Polished Rod Load (MPRL)</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: telemetry.polishedRodMinLoad < 1000 ? 'var(--accent-rose)' : 'var(--text-main)',
              }}
            >
              {telemetry.polishedRodMinLoad.toLocaleString()} lbs
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Effective Pump Fillage</span>
            <span className="font-mono glow-text-emerald" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {telemetry.pumpFillagePercent}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Motor Electrical Draw</span>
            <span className="font-mono glow-text-amber" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {telemetry.motorPowerKw} kW
            </span>
          </div>
        </div>

        {/* Quick Mitigation Action */}
        {cardData.anomalyType === 'ROD_FLOATING' && (
          <div
            className="glass-panel"
            style={{
              padding: '16px',
              background: 'rgba(255, 45, 85, 0.1)',
              borderColor: 'rgba(255, 45, 85, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)' }}>
              <AlertTriangle size={18} />
              <strong style={{ fontSize: '0.85rem' }}>Automated Mitigation Recommendation</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
              Reduce VFD speed setpoint from {telemetry.spm} SPM to <strong>3.8 SPM</strong> to restore downstroke rod string tension above 1,500 lbs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
