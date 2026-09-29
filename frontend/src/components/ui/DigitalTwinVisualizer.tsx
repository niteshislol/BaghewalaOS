import React, { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Droplets, Flame, Gauge, Layers, Thermometer, Zap } from 'lucide-react';

export interface RealTimeTelemetry {
  bottomHoleTemp: number;
  viscosity: number;
  acousticFluidLevelMeters: number;
  instantaneousRodPosition: number;
  rodFloatingDetected: boolean;
  rodFloatingRiskScore: number;
  oilRate: number;
  tubingHeadPressureBar: number;
  motorPowerKw: number;
  motorCurrentAmps: number;
  netDailyMargin: number;
  waterCut: number;
  specificEnergyCost: number;
  instantaneousRodLoad: number;
}
export interface ReservoirParameters { depth: number; reservoirTemp: number; }
export interface SRPParameters { strokeLength: number; spm: number; }

interface DigitalTwinProps {
  telemetry: RealTimeTelemetry;
  srp: SRPParameters;
  res: ReservoirParameters;
  simDay: number;
  wellName: string;
}

export const DigitalTwinVisualizer: React.FC<DigitalTwinProps> = ({
  telemetry,
  srp,
  res,
  simDay,
  wellName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'KINEMATIC' | 'SCADA_PID' | 'THERMAL_MAP'>('KINEMATIC');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let timeTicker = 0;

    const render = () => {
      timeTicker += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // -------------------------------------------------------------
      // MODE 1: KINEMATIC DIGITAL TWIN & WELLBORE SCHEMATIC
      // -------------------------------------------------------------
      if (viewMode === 'KINEMATIC') {
        // 1. Geological Strata Background
        // Surface Layer (Desert Sands - Rajasthan)
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, width, 110);

        // Strata 1: Eocene Shale / Clay
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 110, width, 120);

        // Strata 2: Bilara Limestone
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 230, width, 140);

        // Strata 3: Jodhpur Pay Sandstone (Bottom Reservoir Layer)
        const resTopY = height - 160;
        const resGrad = ctx.createLinearGradient(0, resTopY, 0, height);
        resGrad.addColorStop(0, '#1e1b4b');
        resGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = resGrad;
        ctx.fillRect(0, resTopY, width, 160);

        // Strata Separator Lines & Labels
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 110);
        ctx.lineTo(width, 110);
        ctx.moveTo(0, 230);
        ctx.lineTo(width, 230);
        ctx.moveTo(0, resTopY);
        ctx.lineTo(width, resTopY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Geological Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('SURFACE DESERT DUNES (0 - 150m)', 16, 100);
        ctx.fillText('EOCENE CLAY SEAL (150 - 650m)', 16, 220);
        ctx.fillText('BILARA LIMESTONE FORMATION (650 - 1,050m)', 16, resTopY - 10);
        ctx.fillText(`JODHPUR PAY SANDSTONE (1,100m, 17.5° API, ${res.reservoirTemp}°C)`, 16, resTopY + 24);

        // 2. Heated Thermal Steam Plume / CSS Chamber
        const wellCenterX = width / 2;
        const plumeY = resTopY + 70;
        const thermalRadius = Math.max(30, 180 * Math.pow(telemetry.bottomHoleTemp / 295, 1.4));

        const plumeGrad = ctx.createRadialGradient(
          wellCenterX,
          plumeY,
          10,
          wellCenterX,
          plumeY,
          thermalRadius
        );

        if (telemetry.bottomHoleTemp > 180) {
          plumeGrad.addColorStop(0, 'rgba(255, 87, 34, 0.75)');
          plumeGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
          plumeGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else if (telemetry.bottomHoleTemp > 90) {
          plumeGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
          plumeGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
          plumeGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else {
          plumeGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
          plumeGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        }

        ctx.fillStyle = plumeGrad;
        ctx.beginPath();
        ctx.arc(wellCenterX, plumeY, thermalRadius, 0, Math.PI * 2);
        ctx.fill();

        // Animated steam/ember diffusion particles
        ctx.fillStyle = 'rgba(255, 184, 0, 0.6)';
        for (let i = 0; i < 15; i++) {
          const pAngle = timeTicker * 0.8 + (i * Math.PI * 2) / 15;
          const pDist = ((timeTicker * 15 + i * 20) % thermalRadius);
          const px = wellCenterX + Math.cos(pAngle) * pDist;
          const py = plumeY + Math.sin(pAngle) * (pDist * 0.5);
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3. Casing & Tubing Strings
        const casingW = 32;
        const tubingW = 14;

        // Casing Pipe
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(wellCenterX - casingW / 2, 70, casingW, height - 120);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.strokeRect(wellCenterX - casingW / 2, 70, casingW, height - 120);

        // Tubing Pipe (inner)
        ctx.fillStyle = '#090d16';
        ctx.fillRect(wellCenterX - tubingW / 2, 70, tubingW, height - 120);

        // Fluid Column Level in Annulus
        const fluidLevelY = 70 + (telemetry.acousticFluidLevelMeters / res.depth) * (height - 190);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fillRect(wellCenterX - casingW / 2 + 2, fluidLevelY, (casingW - tubingW) / 2 - 2, height - 120 - fluidLevelY);
        ctx.fillRect(wellCenterX + tubingW / 2 + 1, fluidLevelY, (casingW - tubingW) / 2 - 2, height - 120 - fluidLevelY);

        // 4. Kinematic Pumping Unit Calculation (REALISTIC 3D STYLE)
        const strokeAngle = (telemetry.instantaneousRodPosition / srp.strokeLength) * Math.PI;
        const rodDisp = Math.sin(strokeAngle); // 0 to 1 to 0
        const isUpstroke = Math.sin((telemetry.instantaneousRodPosition / srp.strokeLength) * Math.PI * 2) >= 0;

        const postX = wellCenterX - 118;
        const postY = 100;
        const beamPivotY = 40;
        const beamAngle = (rodDisp - 0.5) * 0.22; // rocking beam angle
        
        // Industrial Color Palette
        const metalDark = '#1e293b';
        const metalBase = '#334155';
        const metalLight = '#64748b';
        const steelBlue = '#0284c7';
        const alertColor = telemetry.rodFloatingDetected ? '#ff2d55' : steelBlue;

        // Base Skid
        ctx.fillStyle = metalDark;
        ctx.fillRect(postX - 80, postY, 180, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(postX - 80, postY + 8, 180, 4);

        // Samson Post (Detailed Truss A-Frame)
        ctx.beginPath();
        ctx.moveTo(postX - 45, postY);
        ctx.lineTo(postX - 10, beamPivotY + 10);
        ctx.lineTo(postX + 10, beamPivotY + 10);
        ctx.lineTo(postX + 45, postY);
        ctx.closePath();
        const samsonGrad = ctx.createLinearGradient(postX - 45, postY, postX + 45, beamPivotY);
        samsonGrad.addColorStop(0, metalLight);
        samsonGrad.addColorStop(1, metalBase);
        ctx.fillStyle = samsonGrad;
        ctx.fill();
        ctx.strokeStyle = metalDark;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner cutouts for truss
        ctx.beginPath();
        ctx.moveTo(postX, postY - 10);
        ctx.lineTo(postX - 15, postY - 10);
        ctx.lineTo(postX, beamPivotY + 25);
        ctx.fillStyle = metalDark;
        ctx.fill();

        // Rotating Crank System
        const crankPivotX = postX - 55;
        const crankPivotY = postY - 20;
        const crankAngle = timeTicker * (srp.spm * 0.15);
        const crankRadius = 24;
        const crankHeadX = crankPivotX + Math.cos(crankAngle) * crankRadius;
        const crankHeadY = crankPivotY + Math.sin(crankAngle) * crankRadius;

        // Gearbox/Motor housing behind crank
        ctx.fillStyle = metalBase;
        ctx.fillRect(crankPivotX - 30, crankPivotY - 20, 45, 40);

        // Crank Disc & Counterweight (Detailed)
        ctx.beginPath();
        ctx.arc(crankPivotX, crankPivotY, crankRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(crankPivotX, crankPivotY, crankRadius, 0, Math.PI * 2);
        const discGrad = ctx.createRadialGradient(crankPivotX, crankPivotY, 5, crankPivotX, crankPivotY, crankRadius);
        discGrad.addColorStop(0, metalLight);
        discGrad.addColorStop(1, metalDark);
        ctx.fillStyle = discGrad;
        ctx.fill();
        ctx.stroke();

        // Counterweight Mass block (Heavy Steel)
        ctx.save();
        ctx.translate(crankPivotX, crankPivotY);
        ctx.rotate(crankAngle + Math.PI); // Opposite to crank head
        ctx.beginPath();
        ctx.arc(0, 0, crankRadius + 12, -Math.PI / 3, Math.PI / 3);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = metalBase;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Crank Pin
        ctx.beginPath();
        ctx.arc(crankHeadX, crankHeadY, 5, 0, Math.PI * 2);
        ctx.fillStyle = alertColor;
        ctx.fill();

        // Pitman Arm (Realistic solid rod)
        const beamTailX = postX - 85 * Math.cos(beamAngle);
        const beamTailY = beamPivotY + 15 - 85 * Math.sin(beamAngle);
        
        ctx.beginPath();
        ctx.moveTo(crankHeadX, crankHeadY);
        ctx.lineTo(beamTailX, beamTailY);
        ctx.strokeStyle = metalLight;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = metalDark;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Walking Beam (Detailed I-Beam)
        ctx.save();
        ctx.translate(postX, beamPivotY + 15);
        ctx.rotate(beamAngle);

        // Beam structural body
        const beamLength = 220;
        const tailLen = -85;
        const headLen = 105;
        const beamHeight = 16;
        
        const beamGrad = ctx.createLinearGradient(0, -beamHeight/2, 0, beamHeight/2);
        beamGrad.addColorStop(0, metalLight);
        beamGrad.addColorStop(0.5, metalBase);
        beamGrad.addColorStop(1, metalDark);

        // Main Beam
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.rect(tailLen, -beamHeight/2, headLen - tailLen, beamHeight);
        ctx.fill();
        ctx.strokeStyle = metalDark;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // I-Beam Flanges
        ctx.fillStyle = alertColor;
        ctx.fillRect(tailLen, -beamHeight/2 - 2, headLen - tailLen, 2);
        ctx.fillRect(tailLen, beamHeight/2, headLen - tailLen, 2);

        // Saddle Bearing (Pivot)
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = metalDark;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Tail Bearing
        ctx.beginPath();
        ctx.arc(tailLen, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = metalDark;
        ctx.fill();

        // Horsehead (Realistic curved steel plate)
        ctx.fillStyle = alertColor;
        ctx.beginPath();
        ctx.moveTo(headLen, -beamHeight/2);
        ctx.lineTo(headLen + 15, -beamHeight/2);
        // Curve down
        ctx.arcTo(headLen + 25, 0, headLen + 15, 45, 30);
        ctx.lineTo(headLen, 45);
        ctx.lineTo(headLen, -beamHeight/2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();

        // Polished Rod connected to horsehead
        const horseheadTipY = (beamPivotY + 15) + 118 * Math.sin(beamAngle);
        const rodTopY = horseheadTipY;
        const plungerY = height - 140 + (rodDisp) * 20;

        // Stuffing Box at wellhead
        ctx.fillStyle = '#374151';
        ctx.fillRect(wellCenterX - 12, 64, 24, 12);

        // Polished Rod & Sucker Rod String
        ctx.strokeStyle = telemetry.rodFloatingDetected ? '#ff2d55' : '#ffb800';
        ctx.lineWidth = telemetry.rodFloatingDetected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(wellCenterX, rodTopY);

        if (telemetry.rodFloatingDetected && !isUpstroke) {
          // Dynamic rod buckling wave during floating downstroke!
          const midY = (rodTopY + plungerY) / 2;
          const wobble = Math.sin(timeTicker * 6) * 7;
          ctx.quadraticCurveTo(wellCenterX + wobble, midY, wellCenterX, plungerY);
        } else {
          ctx.lineTo(wellCenterX, plungerY);
        }
        ctx.stroke();

        // Downhole Plunger & Dual Valve Action
        ctx.fillStyle = '#ff7a00';
        ctx.fillRect(wellCenterX - 5, plungerY - 14, 10, 28);

        // Traveling Valve (on plunger) - OPEN on downstroke, CLOSED on upstroke
        const travelingValveOpen = !isUpstroke;
        ctx.fillStyle = travelingValveOpen ? '#00ff88' : '#ff2d55';
        ctx.beginPath();
        ctx.arc(wellCenterX, plungerY - 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Standing Valve (at bottom of tubing) - CLOSED on downstroke, OPEN on upstroke
        const standingValveOpen = isUpstroke;
        ctx.fillStyle = standingValveOpen ? '#00ff88' : '#ff2d55';
        ctx.beginPath();
        ctx.arc(wellCenterX, height - 125, 5, 0, Math.PI * 2);
        ctx.fill();

        // Oil Flow particles inside tubing
        ctx.fillStyle = 'rgba(255, 184, 0, 0.8)';
        for (let i = 0; i < 7; i++) {
          const py = ((timeTicker * 30 + i * 45) % (height - 210)) + 80;
          ctx.beginPath();
          ctx.arc(wellCenterX, height - py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // -------------------------------------------------------------
      // MODE 2: SCADA SYNOPTIC P&ID FLOW DIAGRAM
      // -------------------------------------------------------------
      else if (viewMode === 'SCADA_PID') {
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, width, height);

        // P&ID Grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw Christmas Tree / Wellhead P&ID Box
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(100, 180, 140, 200);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.fillRect(100, 180, 140, 200);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`WELLHEAD X-TREE #${wellName}`, 108, 205);

        // Production Flowline
        ctx.strokeStyle = '#ffb800';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(240, 230);
        ctx.lineTo(460, 230);
        ctx.lineTo(460, 320);
        ctx.lineTo(650, 320);
        ctx.stroke();

        // Flow Direction Arrows
        ctx.fillStyle = '#ffb800';
        ctx.beginPath();
        ctx.moveTo(350, 225);
        ctx.lineTo(365, 230);
        ctx.lineTo(350, 235);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(560, 315);
        ctx.lineTo(575, 320);
        ctx.lineTo(560, 325);
        ctx.fill();

        // Flowmeter Instrumentation Circle (FT-101)
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(380, 230, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText('FT-101', 362, 226);
        ctx.fillText(`${telemetry.oilRate} m³/d`, 355, 240);

        // Pressure Transmitter (PT-101)
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(170, 130, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('PT-101', 153, 126);
        ctx.fillText(`${telemetry.tubingHeadPressureBar} bar`, 147, 140);

        // Connection line to tree
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(170, 156);
        ctx.lineTo(170, 180);
        ctx.stroke();

        // Steam Injection Line
        ctx.strokeStyle = '#ff2d55';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(40, 310);
        ctx.lineTo(100, 310);
        ctx.stroke();

        ctx.fillStyle = '#ff2d55';
        ctx.fillText('STEAM INLET', 30, 298);

        // Separator Header Box
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.strokeRect(520, 260, 180, 140);
        ctx.fillRect(520, 260, 180, 140);
        ctx.fillStyle = '#a855f7';
        ctx.fillText('PRODUCTION MANIFOLD', 535, 285);
        ctx.fillStyle = '#fff';
        ctx.fillText(`NET CASH: $${telemetry.netDailyMargin}/day`, 535, 315);
        ctx.fillText(`WATER CUT: ${telemetry.waterCut}%`, 535, 335);
        ctx.fillText(`SPECIFIC OPEX: $${telemetry.specificEnergyCost}/bbl`, 535, 355);
      }

      // -------------------------------------------------------------
      // MODE 3: THERMAL CONTOUR MAP
      // -------------------------------------------------------------
      else if (viewMode === 'THERMAL_MAP') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;

        // Radial Thermal Isotherm Rings
        const isotherms = [
          { r: 240, temp: 47, color: 'rgba(56, 189, 248, 0.15)', label: '47°C Ambient Rock' },
          { r: 180, temp: 95, color: 'rgba(245, 158, 11, 0.25)', label: '95°C Mobility Boundary' },
          { r: 120, temp: 180, color: 'rgba(255, 87, 34, 0.4)', label: '180°C Active Viscous Transition' },
          { r: 60, temp: 295, color: 'rgba(255, 45, 85, 0.65)', label: '295°C Steam Core' },
        ];

        isotherms.forEach((iso) => {
          ctx.fillStyle = iso.color;
          ctx.beginPath();
          ctx.arc(cx, cy, iso.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#ffffff';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillText(iso.label, cx + iso.r * 0.6, cy - iso.r * 0.6);
        });

        // Current Well Bore Center Marker
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`${wellName} (${telemetry.bottomHoleTemp}°C / ${telemetry.viscosity} cP)`, cx - 80, cy - 16);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [telemetry, srp, res, simDay, viewMode]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
      {/* Canvas Digital Twin Column */}
      <div className="glass-panel" style={{ padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="var(--primary-cyan)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Baghewala Well #{wellName} Live Digital Twin
              </h2>
              <span className="badge badge-emerald font-mono" style={{ fontSize: '0.7rem' }}>
                SCADA SYNC
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Coupled dual-physics kinematic surface pump motion & reservoir thermal decay
            </p>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(7, 11, 18, 0.7)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('KINEMATIC')}
              className={`tab-btn-mini ${viewMode === 'KINEMATIC' ? 'active-cyan' : ''}`}
            >
              <Layers size={14} /> 3D Kinematic
            </button>
            <button
              onClick={() => setViewMode('SCADA_PID')}
              className={`tab-btn-mini ${viewMode === 'SCADA_PID' ? 'active-emerald' : ''}`}
            >
              <Activity size={14} /> P&ID Synoptic
            </button>
            <button
              onClick={() => setViewMode('THERMAL_MAP')}
              className={`tab-btn-mini ${viewMode === 'THERMAL_MAP' ? 'active-amber' : ''}`}
            >
              <Flame size={14} /> Thermal Isotherms
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.25)' }}>
          <canvas
            ref={canvasRef}
            width={720}
            height={520}
            style={{ width: '100%', height: 'auto', aspectRatio: '720 / 520', background: '#060a12', display: 'block' }}
          />

          {/* Canvas Floating HUD Badges */}
          <div className="canvas-hud hud-left">
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESERVOIR THERMAL FRONT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }} className="font-mono glow-text-cyan">
                {telemetry.bottomHoleTemp} °C
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Crude Viscosity: <strong style={{ color: '#fff' }}>{telemetry.viscosity} cP</strong>
            </div>
          </div>

          <div className="canvas-hud hud-right">
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>VALVE SEAT DYNAMICS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                TV: {telemetry.instantaneousRodPosition > srp.strokeLength / 2 ? 'OPEN' : 'CLOSED'}
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                SV: {telemetry.instantaneousRodPosition <= srp.strokeLength / 2 ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live Load: <strong style={{ color: '#fff' }}>{telemetry.instantaneousRodLoad.toLocaleString()} lbs</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry & Anomaly Diagnostics Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Rod Floating Status Box */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            borderColor: telemetry.rodFloatingDetected ? 'rgba(255, 45, 85, 0.5)' : 'rgba(0, 255, 136, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROD FLOATING DIAGNOSIS</span>
            {telemetry.rodFloatingDetected ? (
              <span className="badge badge-rose">CRITICAL ANOMALY</span>
            ) : (
              <span className="badge badge-emerald">OPTIMAL TENSION</span>
            )}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800 }} className={telemetry.rodFloatingDetected ? 'glow-text-rose' : 'glow-text-emerald'}>
              {telemetry.rodFloatingRiskScore}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Downstroke Viscous Drag Severity Index</div>
          </div>

          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.6)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            <div
              style={{
                height: '100%',
                width: `${telemetry.rodFloatingRiskScore}%`,
                background: telemetry.rodFloatingDetected
                  ? 'linear-gradient(90deg, #ffb800, #ff2d55)'
                  : 'linear-gradient(90deg, #00ff88, #00f0ff)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {telemetry.rodFloatingDetected
              ? 'Crude cooling below 120°C created viscous drag exceeding downstroke gravity. Rod string is buckling.'
              : 'Rod string descent velocity is stable. Hydrodynamic buoyancy drag is safely balanced.'}
          </p>
        </div>

        {/* Live Key Metrics Cards */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            SCADA Telemetry Gauges
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Droplets size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.85rem' }}>Oil Production</span>
            </div>
            <span className="font-mono glow-text-emerald" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {telemetry.oilRate} m³/day
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gauge size={16} color="var(--primary-cyan)" />
              <span style={{ fontSize: '0.85rem' }}>Tubing Pressure</span>
            </div>
            <span className="font-mono glow-text-cyan" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {telemetry.tubingHeadPressureBar} bar
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.85rem' }}>Motor Power</span>
            </div>
            <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {telemetry.motorPowerKw} kW ({telemetry.motorCurrentAmps}A)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.85rem' }}>Net Profit</span>
            </div>
            <span className="font-mono glow-text-emerald" style={{ fontSize: '1rem', fontWeight: 700 }}>
              ${telemetry.netDailyMargin}/day
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
