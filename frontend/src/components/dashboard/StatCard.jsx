
import React from 'react'

export default function StatCard({ label, value, unit, subtext, color, trend }) {
  const c = color || 'var(--accent)'
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '20px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c, opacity: 0.6 }} />
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: c, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
          {value ?? '—'}
        </span>
        {unit && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{subtext}</div>}
    </div>
  )
}
