import { useEffect, useState } from 'react'
import { getFieldSnapshot, optimizeWell } from '../services/api'
import { useWellStore } from '../stores/wellStore'
import toast from 'react-hot-toast'

export default function FieldDashboard() {
  const { setWell, selectedWell, liveTelemetry } = useWellStore()
  const [field, setField] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState<string | null>(null)

  const fetchField = async () => {
    try {
      const data = await getFieldSnapshot()
      setField(data)
    } catch { toast.error('Could not load field snapshot') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchField(); const t = setInterval(fetchField, 30000); return () => clearInterval(t) }, [])

  const handleOptimize = async (wellId: string) => {
    setOptimizing(wellId)
    try {
      const res = await optimizeWell(wellId)
      toast.success(`Pareto optimizer complete — ${res.n_pareto} solutions found`)
    } catch { toast.error('Optimization failed') }
    finally { setOptimizing(null) }
  }

  const metrics = (field?.metrics || {}) as Record<string, unknown>
  const wells = (field?.wells || []) as Array<Record<string, unknown>>
  const actionPlan = (field?.action_plan || []) as Array<Record<string, unknown>>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <div className="page-title">🗺️ Baghewala Field Dashboard</div>
          <div className="page-subtitle">Real-time field-level KPIs · All Wells · SIH26120 · Oil India Limited</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="pulse-dot"></span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchField}>↻ Refresh</button>
        </div>
      </div>

      {/* Field KPIs */}
      {!loading && (
        <div className="kpi-grid">
          {[
            { label: 'Total Field Oil Rate', value: String(metrics.total_field_oil_rate || '—'), unit: 'BOPD', color: 'var(--primary)' },
            { label: 'Active Wells', value: `${metrics.active_wells || 0}/${metrics.well_count || 0}`, unit: 'Online', color: 'var(--success)' },
            { label: 'Average SOR', value: String(metrics.average_sor || '—'), unit: 'm³/m³', color: (Number(metrics.average_sor) > 3.5 ? 'var(--danger)' : 'var(--success)') },
            { label: 'Active Alerts', value: String(metrics.active_alerts || 0), unit: 'Alerts', color: (Number(metrics.active_alerts) > 3 ? 'var(--danger)' : 'var(--warning)') },
            { label: 'Field Health Score', value: `${((Number(metrics.field_equipment_health) || 0) * 100).toFixed(0)}%`, unit: 'Equipment', color: 'var(--secondary)' },
            { label: 'Predicted Failures', value: String(metrics.predicted_failures || 0), unit: 'Next 30 days', color: (Number(metrics.predicted_failures) > 0 ? 'var(--danger)' : 'var(--success)') },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={{ color: kpi.color, fontSize: 22 }}>{kpi.value}</div>
              <div className="kpi-unit">{kpi.unit}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36 }}></div>
        </div>
      )}

      {/* Well Cards Grid */}
      {!loading && (
        <div>
          <div className="section-label">Individual Wells</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {wells.map((well) => {
              const isSelected = well.well_id === selectedWell
              const isCritical = String(well.status) === 'critical' || Number(well.fail) > 0.4
              const isWarning = Number(well.fail) > 0.25
              return (
                <div
                  key={String(well.well_id)}
                  className={`card ${isCritical ? 'card-danger' : isSelected ? 'card-amber' : ''}`}
                  style={{ cursor: 'pointer', transition: 'all 200ms' }}
                  onClick={() => setWell(String(well.well_id))}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{String(well.well_id)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{String(well.name || '')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className={`badge ${isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success'}`}>
                        {String(well.status || 'normal')}
                      </span>
                      <span className={`badge ${String(well.phase) === 'production' ? 'badge-success' : String(well.phase) === 'injection' ? 'badge-info' : 'badge-amber'}`}>
                        {String(well.phase || '—')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['Oil Rate', `${Number(well.oil || 0).toFixed(1)} BOPD`],
                      ['SOR', `${Number(well.sor || 0).toFixed(2)}`],
                      ['Temp', `${Number(well.temp || 0).toFixed(0)}°C`],
                      ['Health', `${(Number(well.health || 0) * 100).toFixed(0)}%`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {Number(well.fail) > 0 && (
                    <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 11 }}>
                      ⚠️ Failure probability: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{(Number(well.fail) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); setWell(String(well.well_id)) }}>
                      Select
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); handleOptimize(String(well.well_id)) }}
                      disabled={optimizing === well.well_id}
                    >
                      {optimizing === well.well_id ? '⏳ Optimizing...' : '🎯 Optimize'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Priority Plan */}
      {!loading && actionPlan.length > 0 && (
        <div>
          <div className="section-label">Action Priority Plan (by Urgency)</div>
          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rank', 'Well', 'Oil Rate', 'SOR', 'Health', 'Failure Risk', 'Urgency', 'Action'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actionPlan.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setWell(String(row.well_id))}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: i === 0 ? 'var(--danger)' : 'var(--text-muted)' }}>#{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--primary)' }}>{String(row.well_id)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{Number(row.oil).toFixed(1)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: Number(row.sor) > 3.5 ? 'var(--danger)' : 'inherit' }}>{Number(row.sor).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px' }}><span className={`badge ${Number(row.health) > 0.7 ? 'badge-success' : 'badge-warning'}`}>{(Number(row.health) * 100).toFixed(0)}%</span></td>
                    <td style={{ padding: '10px 12px', color: Number(row.fail) > 0.35 ? 'var(--danger)' : 'inherit' }}>{(Number(row.fail) * 100).toFixed(0)}%</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: Number(row.urgency) > 50 ? 'var(--danger)' : 'var(--warning)' }}>{Number(row.urgency).toFixed(0)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{String(row.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
