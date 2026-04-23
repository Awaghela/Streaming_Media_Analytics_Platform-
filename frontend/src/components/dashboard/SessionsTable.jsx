
import React from 'react'

const NC_COLOR = {
  excellent: 'var(--success)', good: 'var(--accent)',
  fair: 'var(--warning)', poor: 'var(--danger)',
}

function fmt(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`
}

export default function SessionsTable({ sessions }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Session ID', 'Content', 'Device', 'Network', 'CDN', 'Duration', 'Started'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, fontWeight: 400 }}>{h.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={s.session_id} style={{ borderBottom: '1px solid var(--border)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                {s.session_id.slice(0, 13)}…
              </td>
              <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{s.content_title || s.content_id}</td>
              <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{s.device_type}</td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ color: NC_COLOR[s.network_condition] || 'var(--muted)',
                  background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                  {s.network_condition || '—'}
                </span>
              </td>
              <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{s.cdn || '—'}</td>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(s.total_duration_ms)}</td>
              <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 11 }}>
                {new Date(s.started_at).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
