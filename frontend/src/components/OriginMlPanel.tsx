import React, { useEffect, useState } from 'react'
import { Brain, ShieldAlert, TrendingUp, Lightbulb } from 'lucide-react'
import { getOriginExplainability, getOriginPrediction } from '../services/api'
import { useWellStore } from '../stores/wellStore'

export default function OriginMlPanel() {
  const { selectedWell } = useWellStore()
  const [prediction, setPrediction] = useState<any>(null)
  const [explain, setExplain] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    Promise.all([getOriginPrediction(selectedWell), getOriginExplainability(selectedWell)])
      .then(([p, e]) => { if (active) { setPrediction(p); setExplain(e) } })
      .catch(err => { if (active) setError(err?.message || 'Unable to load ORIGIN ML layer') })
    return () => { active = false }
  }, [selectedWell])

  const prod = prediction?.models?.production
  const fail = prediction?.models?.failure

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={20} color="var(--primary)" />
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>ORIGIN ML Cross-Check</h3>
            <span className="badge badge-info">XGBoost</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Imported from WagheraOS and evaluated against the live BaghewalaOS physics twin.
          </p>
        </div>
        <span className="badge badge-amber">Synthetic-model evidence</span>
      </div>

      {error && <div className="card-danger" style={{ marginTop: 16, padding: 12, borderRadius: 8, fontSize: 12 }}>{error}</div>}

      {prediction && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 18 }}>
          <div className="kpi-card"><div className="kpi-label">ML Production</div><div className="kpi-value">{Number(prediction.production_bopd).toFixed(1)}</div><div className="kpi-unit">BOPD</div></div>
          <div className="kpi-card"><div className="kpi-label">ML Failure Risk</div><div className="kpi-value" style={{ color: 'var(--warning)' }}>{(Number(prediction.failure_probability) * 100).toFixed(1)}%</div><div className="kpi-unit">probability</div></div>
          <div className="kpi-card"><div className="kpi-label">Production Model</div><div className="kpi-value" style={{ fontSize: 18 }}>{prod?.model_name || 'XGBoost'}</div><div className="kpi-unit">R² {typeof prod?.r2 === 'number' ? prod.r2.toFixed(3) : '—'}</div></div>
          <div className="kpi-card"><div className="kpi-label">Failure Model</div><div className="kpi-value" style={{ fontSize: 18 }}>{fail?.model_name || 'XGBoost'}</div><div className="kpi-unit">ROC-AUC {typeof fail?.roc_auc === 'number' ? fail.roc_auc.toFixed(3) : '—'}</div></div>
        </div>
      )}

      {explain?.explanations && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 20 }}>
          {explain.explanations.map((block: any) => (
            <div key={block.task} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
                {block.task === 'failure' ? <ShieldAlert size={15} /> : <TrendingUp size={15} />} {block.task} drivers
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {block.top_features.slice(0, 5).map((item: any) => (
                  <div key={item.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8, alignItems: 'center' }}>
                    <div><div style={{ fontSize: 12 }}>{item.feature}</div><div style={{ height: 4, background: 'var(--bg-card)', borderRadius: 99, marginTop: 4 }}><div style={{ height: 4, width: `${Math.min(100, item.importance * 1000)}%`, background: 'var(--primary)', borderRadius: 99 }} /></div></div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.importance.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11 }}>
        <Lightbulb size={14} /> Model importance is explanatory, not causal. Field calibration is required before operational deployment.
      </div>
    </section>
  )
}
