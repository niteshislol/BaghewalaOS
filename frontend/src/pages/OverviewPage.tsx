import { useEffect, useState } from 'react'
import { useWellStore } from '../stores/wellStore'
import { getTwinState, getAlerts, getVFD, applyVFD, diagnoseWell, twinAdvance, twinReset } from '../services/api'
import toast from 'react-hot-toast'
import { Bot } from 'lucide-react'
import { AiAdvisorBox } from '../components/AiAdvisorBox'
import HealthScoreGauge from '../components/ui/HealthScoreGauge'

export default function OverviewPage() {
  const { selectedWell, liveTelemetry } = useWellStore()
  // Now explicitly typing based on our Python TwinState schema
  const [twinState, setTwinState] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [vfd, setVfd] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applyingVfd, setApplyingVfd] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [t, a, v, d] = await Promise.all([
        getTwinState(selectedWell), 
        getAlerts(selectedWell),
        getVFD(selectedWell), 
        diagnoseWell(selectedWell)
      ])
      setTwinState(t); setAlerts(a.alerts || []); setVfd(v); setDiagnosis(d)
    } catch (e) { 
      toast.error('Failed to load twin state') 
      console.error(e)
    }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [selectedWell])

  const handleApplyVFD = async () => {
    setApplyingVfd(true)
    try {
      const res = await applyVFD(selectedWell)
      toast.success(res.applied ? `✅ VFD applied: ${res.governor?.recommended_spm} SPM` : `ℹ️ Advisory only — ${res.reason}`)
      fetchAll()
    } catch { toast.error('VFD apply failed') }
    finally { setApplyingVfd(false) }
  }
  
  const handleAdvance = async (days: number) => {
    setAdvancing(true)
    try {
      const t = await twinAdvance(selectedWell, days)
      setTwinState(t)
      toast.success(`Advanced simulation by ${days} day(s)`)
      // Refresh alerts based on new time
      const a = await getAlerts(selectedWell)
      setAlerts(a.alerts || [])
    } catch {
      toast.error('Failed to advance twin')
    } finally {
      setAdvancing(false)
    }
  }

  const live = liveTelemetry as Record<string, unknown> | null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title">📊 Command Center — {selectedWell}</div>
          <div className="page-subtitle">
            {twinState ? `Phase: ${twinState.lifecycle_phase} · Cycle ${twinState.cycle} · Day ${twinState.cycle_day}` : 'Loading...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {live && <span className="badge badge-success"><span className="pulse-dot" style={{width:6,height:6}}></span>LIVE</span>}
          <button className="btn btn-secondary btn-sm" onClick={() => handleAdvance(1)} disabled={advancing || loading}>
             {advancing ? '⏳' : '⏭️ +1 Day'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>↻</button>
        </div>
      </div>

      {loading && <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" style={{width:36,height:36}}></div></div>}

      {!loading && twinState && (
        <>
          <div className="card card-glass" style={{ marginBottom: 4 }}>
            <HealthScoreGauge score={(live?.overall_health as number) ?? (twinState?.health_status === 'HEALTHY' ? 88 : 58)} />
          </div>

          <div className="kpi-grid">
            {[
              { label: 'Oil Rate', value: live?.oil_rate_bopd ?? twinState.production.oil_rate_bopd.value.toFixed(1), unit: twinState.production.oil_rate_bopd.unit, warn: false },
              { label: 'Reservoir Temp', value: live?.reservoir_temp_c ?? twinState.reservoir.temperature_c.value.toFixed(1), unit: twinState.reservoir.temperature_c.unit, warn: false },
              { label: 'Skin Factor', value: twinState.reservoir.skin.value.toFixed(2), unit: '', warn: twinState.reservoir.skin.value > 5 },
              { label: 'SPM', value: live?.spm ?? twinState.srp.spm.value.toFixed(1), unit: twinState.srp.spm.unit, warn: false },
              { label: 'Steam Injected', value: twinState.thermal.steam_injected_m3.value.toFixed(0), unit: twinState.thermal.steam_injected_m3.unit, warn: false },
              { label: 'Heated Radius', value: twinState.reservoir.heated_radius_m.value.toFixed(1), unit: twinState.reservoir.heated_radius_m.unit, warn: false },
            ].map(kpi => (
              <div key={kpi.label} className={`kpi-card ${kpi.warn ? 'card-danger' : ''}`}>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{fontSize: 20, color: kpi.warn ? 'var(--danger)' : 'var(--primary)'}}>{kpi.value}</div>
                <div className="kpi-unit">{kpi.unit}</div>
                <div style={{fontSize: 9, color: 'var(--text-muted)', marginTop: 4}}>Model Provenance</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {diagnosis && (
              <div className={`card ${diagnosis.severity === 'Critical' ? 'card-danger' : diagnosis.severity === 'Warning' ? 'card-amber' : ''}`}>
                <div className="section-label">🔍 System Diagnosis</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{String(diagnosis.severity)}</span>
                  <span className={`badge ${diagnosis.severity === 'Critical' ? 'badge-danger' : diagnosis.severity === 'Warning' ? 'badge-warning' : 'badge-success'}`}>{String(diagnosis.severity)}</span>
                </div>
                {(diagnosis.evidence as string[] || []).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 4 }}>⚠ {e}</div>
                ))}
                {(diagnosis.likely_causes as string[] || []).map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>• {c}</div>
                ))}
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                  → {String(diagnosis.recommended_action)}
                </div>
              </div>
            )}

            {vfd && (
              <div className="card card-teal">
                <div className="section-label">⚡ VFD Governor</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current SPM</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{String(vfd.current_spm)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recommended SPM</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--secondary)' }}>{String(vfd.recommended_spm)}</div>
                  </div>
                </div>
                {(vfd.reasons as Array<{type: string; text: string}> || []).slice(0, 3).map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span style={{ color: r.type === 'safety' ? 'var(--danger)' : r.type === 'physics' ? 'var(--secondary)' : 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, marginRight: 4 }}>{r.type}</span>
                    {r.text}
                  </div>
                ))}
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={handleApplyVFD} disabled={applyingVfd}>
                  {applyingVfd ? '⏳ Applying...' : `⚡ Apply ${vfd.recommended_spm} SPM / ${vfd.recommended_vfd}% VFD`}
                </button>
              </div>
            )}
          </div>

          {alerts.length > 0 && (
            <div>
              <div className="section-label">🚨 Active Alerts ({alerts.length})</div>
              {alerts.map((a, i) => (
                <div key={i} className={`alert-item ${String(a.severity).toLowerCase()}`}>
                  <div style={{ fontSize: 18 }}>{a.severity === 'CRITICAL' ? '🔴' : a.severity === 'WARNING' ? '🟡' : 'ℹ️'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{String(a.code)} — {String(a.cause)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Evidence: {String(a.evidence)}</div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>→ {String(a.recommended_action)}</div>
                  </div>
                  <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>{String(a.severity)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating AI Copilot Button */}
      <button 
        onClick={() => setCopilotOpen(true)}
        style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          width: 60,
          height: 60,
          borderRadius: 30,
          background: 'linear-gradient(135deg, #ff7a00, #ff5500)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 32px rgba(255,122,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000
        }}
        title="Open AI Copilot"
      >
        <Bot size={28} />
      </button>

      {/* Copilot Modal */}
      <AiAdvisorBox isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  )
}
