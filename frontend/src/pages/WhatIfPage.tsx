import { useState, useEffect } from 'react'
import { useWellStore } from '../stores/wellStore'
import { getTwinState, twinPreview } from '../services/api'
import toast from 'react-hot-toast'
import { Sliders, Play, RotateCcw } from 'lucide-react'

export default function WhatIfPage() {
  const { selectedWell } = useWellStore()
  
  const [baseState, setBaseState] = useState<any>(null)
  const [previewState, setPreviewState] = useState<any>(null)
  
  const [spm, setSpm] = useState<number>(6)
  const [steamVol, setSteamVol] = useState<number>(2000)
  const [soakDays, setSoakDays] = useState<number>(5)
  
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  const fetchBaseline = async () => {
    setLoading(true)
    try {
      const state = await getTwinState(selectedWell)
      setBaseState(state)
      setSpm(state.srp.spm.value)
      setSteamVol(state.thermal.steam_injected_m3.value > 0 ? state.thermal.steam_injected_m3.value : 2000)
      setSoakDays(state.thermal.soak_days.value > 0 ? state.thermal.soak_days.value : 5)
      setPreviewState(null)
    } catch (e) {
      toast.error('Failed to load baseline state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBaseline() }, [selectedWell])

  const handlePreview = async () => {
    setSimulating(true)
    try {
      const patch = { spm, steam_volume: steamVol, soak_days: soakDays }
      const res = await twinPreview(selectedWell, patch)
      setPreviewState(res)
      toast.success('Simulation complete!')
    } catch (e) {
      toast.error('Preview failed')
    } finally {
      setSimulating(false)
    }
  }

  const renderKPI = (label: string, baseVal: number, preVal: number, unit: string) => {
    const diff = preVal - baseVal
    const diffFmt = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)
    const color = diff > 0 ? 'var(--primary)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)'
    
    return (
      <div className="bg-canvas/60 p-3 rounded-lg border border-border-subtle" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{preVal.toFixed(1)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{unit}</span>
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>
          {diff !== 0 ? `Δ ${diffFmt} from baseline` : 'No change'}
        </div>
      </div>
    )
  }

  if (loading || !baseState) {
    return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" style={{width:36,height:36}}></div></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title"><Sliders className="inline w-6 h-6 mr-2" /> What-If Sandbox — {selectedWell}</div>
          <div className="page-subtitle">Preview the physics-based consequences of parameter changes.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchBaseline} disabled={simulating}><RotateCcw className="w-4 h-4 mr-1"/> Reset</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Controls */}
        <div className="card space-y-6">
          <div className="section-label">Adjust Parameters</div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Pump Speed (SPM)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{spm.toFixed(1)}</span>
            </div>
            <input type="range" min="1" max="10" step="0.1" value={spm} onChange={(e) => setSpm(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Steam Injection (m³)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{steamVol}</span>
            </div>
            <input type="range" min="1000" max="5000" step="100" value={steamVol} onChange={(e) => setSteamVol(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Soak Duration (Days)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{soakDays}</span>
            </div>
            <input type="range" min="1" max="14" step="1" value={soakDays} onChange={(e) => setSoakDays(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handlePreview} disabled={simulating}>
            {simulating ? '⏳ Simulating...' : <><Play className="w-4 h-4 mr-2" /> Run Twin Prediction</>}
          </button>
        </div>

        {/* Results */}
        <div className="card">
          <div className="section-label" style={{ marginBottom: 16 }}>Simulation Results (+24h Projection)</div>
          
          {!previewState ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 8 }}>
              Adjust parameters and click "Run Twin Prediction" to see outcomes.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {renderKPI('Oil Rate', baseState.production.oil_rate_bopd.value, previewState.production.oil_rate_bopd.value, 'BOPD')}
              {renderKPI('Reservoir Temp', baseState.reservoir.temperature_c.value, previewState.reservoir.temperature_c.value, '°C')}
              {renderKPI('Liquid Rate', baseState.production.liquid_rate_m3d.value, previewState.production.liquid_rate_m3d.value, 'm³/d')}
              {renderKPI('Heated Radius', baseState.reservoir.heated_radius_m.value, previewState.reservoir.heated_radius_m.value, 'm')}
              {renderKPI('SPM', baseState.srp.spm.value, previewState.srp.spm.value, 'strokes/min')}
              {renderKPI('Steam Injected', baseState.thermal.steam_injected_m3.value, previewState.thermal.steam_injected_m3.value, 'm³')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
