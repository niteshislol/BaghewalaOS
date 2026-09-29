import React from 'react'

type Props = { score: number; label?: string; size?: number }

export default function HealthScoreGauge({ score, label = 'Well Health', size = 140 }: Props) {
  const normalized = Math.max(0, Math.min(100, score))
  const radius = (size - 18) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (normalized / 100) * circumference
  const tone = normalized >= 80 ? 'var(--success)' : normalized >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <strong style={{ fontSize: 30, fontFamily: 'var(--font-mono)' }}>{Math.round(normalized)}</strong>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>/ 100</span>
        </div>
      </div>
      <div>
        <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Petro-Twin command-center pattern adapted to BaghewalaOS.
          <br />Physics state + intelligence diagnostics.
        </div>
      </div>
    </div>
  )
}
