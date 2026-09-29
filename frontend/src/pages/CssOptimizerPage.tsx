import { useState, useEffect } from 'react'
import { useWellStore } from '../stores/wellStore'
import { getTwinState } from '../services/api'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Flame, CheckCircle, Sliders, ArrowRight, Activity, Zap } from 'lucide-react'

export default function CssOptimizerPage() {
  const { selectedWell } = useWellStore()
  
  const [twin, setTwin] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)

  const fetchBaseline = async () => {
    setLoading(true)
    try {
      const state = await getTwinState(selectedWell)
      setTwin(state)
    } catch (e) {
      toast.error('Failed to load baseline state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchBaseline() 
    setOptimizationResult(null)
  }, [selectedWell])

  const runOptimizer = async () => {
    setOptimizing(true)
    try {
      // POST to our new css_optimize endpoint
      const res = await axios.post(`/api/v1/wells/${selectedWell}/css_optimize`)
      setOptimizationResult(res.data)
      toast.success('CSS Optimization Complete!')
    } catch (e) {
      toast.error('Optimization failed')
      console.error(e)
    } finally {
      setOptimizing(false)
    }
  }

  if (loading || !twin) {
    return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" style={{width:36,height:36}}></div></div>
  }

  const currentSteam = twin.thermal.steam_injected_m3.value
  const currentSoak = twin.thermal.soak_days.value
  
  const best = optimizationResult?.best?.params
  const bestPhysics = optimizationResult?.best?.physics

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Flame size={24} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>CSS ML Surrogate Optimizer</h2>
              <span className="badge badge-amber">Cycle #{twin.cycle} Active</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Uses a Differential Evolution search over the Gradient Boosting CSS Surrogate Model, verified against the Physics Twin.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
             <button className="btn btn-secondary" onClick={runOptimizer} disabled={optimizing}>
              {optimizing ? '⏳ Searching Surrogate Surface...' : <><Zap size={16} style={{marginRight:6}}/> Run ML Optimizer</>}
             </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Current State */}
        <div className="card space-y-6">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--primary-cyan)" />
            Current Cycle Injection Controls
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Steam Injection Volume</span>
              <span className="font-mono glow-text-cyan" style={{ fontWeight: 700 }}>{currentSteam.toFixed(0)} m³</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Soak Period Duration</span>
              <span className="font-mono glow-text-cyan" style={{ fontWeight: 700 }}>{currentSoak.toFixed(1)} Days</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
               <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Current Oil Rate</span>
               <span className="font-mono" style={{ fontWeight: 700 }}>{twin.production.oil_rate_bopd.value.toFixed(1)} BOPD</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
               <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Current Reservoir Temp</span>
               <span className="font-mono" style={{ fontWeight: 700 }}>{twin.reservoir.temperature_c.value.toFixed(1)} °C</span>
            </div>
          </div>
        </div>

        {/* Optimized State */}
        <div className="card space-y-6" style={{ borderColor: optimizationResult ? 'rgba(56, 189, 248, 0.4)' : 'var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: optimizationResult ? 'var(--primary-cyan)' : 'var(--text-primary)' }}>
            <CheckCircle size={18} />
            AI Recommended Cycle Target
          </h3>

          {!optimizationResult ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 8 }}>
              Click "Run ML Optimizer" to compute the global optimum.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimal Steam Volume</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                    {best.steam_tonnes.toFixed(0)} Tonnes
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimal Soak Days</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                    {best.soak_days.toFixed(1)} Days
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Predicted Cycle Oil Yield</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {bestPhysics?.oil_bbl?.toFixed(0)} bbls
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Predicted SOR (Steam-Oil Ratio)</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {bestPhysics?.sor_bbl_per_bbl?.toFixed(2)} bbl/bbl
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                 * Optimizer ran {optimizationResult.iterations} differential evolution sweeps.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
