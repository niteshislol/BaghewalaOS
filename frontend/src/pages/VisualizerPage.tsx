import React, { useState, useEffect } from 'react'
import { useWellStore } from '../stores/wellStore'
import { DigitalTwinVisualizer, RealTimeTelemetry, ReservoirParameters, SRPParameters } from '../components/ui/DigitalTwinVisualizer'

export default function VisualizerPage() {
  const { selectedWell, twin } = useWellStore()
  
  // We need to map our twin data to the expected telemetry interface
  // The Visualizer component internally animates by using a `timeTicker`
  // We only need to provide it the current static state snapshot.
  const [telemetry, setTelemetry] = useState<RealTimeTelemetry>({
    bottomHoleTemp: 55,
    viscosity: 500,
    acousticFluidLevelMeters: 450,
    instantaneousRodPosition: 0,
    rodFloatingDetected: false,
    rodFloatingRiskScore: 0,
    oilRate: 48,
    tubingHeadPressureBar: 12,
    motorPowerKw: 45,
    motorCurrentAmps: 70,
    netDailyMargin: 2500,
    waterCut: 22,
    specificEnergyCost: 4.5,
    instantaneousRodLoad: 12000,
  })

  const [srp, setSrp] = useState<SRPParameters>({ strokeLength: 3.0, spm: 6.0 })
  const [res, setRes] = useState<ReservoirParameters>({ depth: 1100, reservoirTemp: 55 })

  useEffect(() => {
    if (!twin) return;
    
    // Convert twin dictionary to the required interfaces
    const t = twin as Record<string, any>;
    
    // Simulate instantaneous rod position moving (0 to strokeLength and back)
    // Actually, the visualizer animation loop calculates strokeAngle based on SPM natively inside requestAnimationFrame.
    // Wait, the Visualizer expects `telemetry.instantaneousRodPosition` to be updating if it wants to draw the rod?
    // Let's look at the visualizer code:
    // It does `Math.sin((telemetry.instantaneousRodPosition / srp.strokeLength) * Math.PI)`
    // Oh, actually in the WELLORA code, it uses a timeTicker natively inside for crank angle `timeTicker * (srp.spm * 0.15)`
    // But for strokeAngle it uses `telemetry.instantaneousRodPosition`!
    // So we need to provide a live changing rod position, or we can just override it to use timeTicker inside the visualizer.
    // Wait, let's just create a local animation loop here to drive `instantaneousRodPosition`.
    
    setTelemetry({
      bottomHoleTemp: parseFloat((t.reservoir_temperature || 55).toFixed(1)),
      viscosity: parseFloat((t.in_situ_viscosity || 500).toFixed(1)),
      acousticFluidLevelMeters: parseFloat((t.fluid_level_m || 450).toFixed(1)),
      instantaneousRodPosition: 0, // Driven by interval below
      rodFloatingDetected: (t.rod_float_risk || 0) > 0.6,
      rodFloatingRiskScore: parseFloat(((t.rod_float_risk || 0) * 100).toFixed(1)),
      oilRate: parseFloat((t.production_rate_bopd || 48).toFixed(1)),
      tubingHeadPressureBar: parseFloat(((t.tubing_pressure_mpa || 1.2) * 10).toFixed(1)), // MPa to Bar
      motorPowerKw: parseFloat((t.motor_power_kw || 45).toFixed(1)),
      motorCurrentAmps: parseFloat((t.motor_current || 70).toFixed(1)),
      netDailyMargin: parseFloat(((t.net_present_value_30d || 75000) / 30).toFixed(0)),
      waterCut: parseFloat((t.water_cut_percent || 22).toFixed(1)),
      specificEnergyCost: parseFloat((t.lifting_cost_per_bbl || 4.5).toFixed(2)),
      instantaneousRodLoad: parseFloat(((t.rod_stress_mpa || 135) * 100).toFixed(0)), // Rough conversion to lbs
    })
    
    setSrp({
      strokeLength: 3.0,
      spm: parseFloat((t.spm || 6.0).toFixed(1))
    })
    
  }, [twin])
  
  // Local animation loop to drive the stroke position so the visualizer animates the horsehead natively
  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();
    
    const animate = (time: number) => {
      const elapsedSec = (time - startTime) / 1000;
      // SPM = strokes per minute. Frequency (Hz) = SPM / 60
      const freq = srp.spm / 60;
      // Phase from 0 to 2PI
      const phase = (elapsedSec * freq * Math.PI * 2) % (Math.PI * 2);
      
      // Calculate position (0 to strokeLength)
      // Math.sin(phase) goes from -1 to 1. We want 0 to strokeLength.
      // 0.5 * (1 - Math.cos(phase)) gives 0 to 1 to 0 smooth motion.
      const pos = 0.5 * (1 - Math.cos(phase)) * srp.strokeLength;
      
      setTelemetry(prev => ({
        ...prev,
        instantaneousRodPosition: pos
      }))
      
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [srp.spm, srp.strokeLength])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Live Machine Visualizer</div>
          <div className="page-subtitle">Real-time kinematic & thermal SCADA view for Well {selectedWell}</div>
        </div>
      </div>
      
      <div style={{ flex: 1 }}>
        <DigitalTwinVisualizer 
          telemetry={telemetry}
          srp={srp}
          res={res}
          simDay={0}
          wellName={selectedWell}
        />
      </div>
    </div>
  )
}
