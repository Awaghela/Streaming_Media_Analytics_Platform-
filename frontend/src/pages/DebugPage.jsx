
import React, { useState } from 'react'
import { fetchSessionMetrics, fetchSessionEvents } from '../utils/api'

export default function DebugPage({ sessions }) {
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (!selected) return
    setLoading(true)
    try {
      const [m, ev] = await Promise.all([fetchSessionMetrics(selected), fetchSessionEvents(selected)])
      setResult({ metrics: m.data, events: ev.data })
    } catch (e) {
      setResult({ error: 'Backend not reachable — run in demo mode with mock data' })
    } finally {
      setLoading(false)
    }
  }

  const blockStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 16 }
  const monoStyle = { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Session Debug View</h1>

      <div style={blockStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Analyze Session</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={selected} onChange={e => setSelected(e.target.value)} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text)', padding: '8px 12px', fontSize: 13, flex: 1,
          }}>
            <option value="">Select a session…</option>
            {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.session_id} — {s.content_title}</option>)}
          </select>
          <button onClick={analyze} disabled={!selected || loading} style={{
            background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>{loading ? 'Loading…' : 'Analyze'}</button>
        </div>
      </div>

      {result?.error && (
        <div style={{ ...blockStyle, borderColor: 'var(--warning)', color: 'var(--warning)' }}>{result.error}</div>
      )}

      {result?.metrics && (
        <div style={blockStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>QoE Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              ['QoE Score', result.metrics.qoe_score?.toFixed(2)],
              ['Startup Delay', result.metrics.startup_delay_ms ? `${result.metrics.startup_delay_ms}ms` : '—'],
              ['Total Buffering', `${result.metrics.total_buffering_ms?.toFixed(0)}ms`],
              ['Buffer Events', result.metrics.buffering_count],
              ['Bitrate Switches', result.metrics.bitrate_switches],
              ['Avg Bitrate', result.metrics.avg_bitrate_kbps ? `${result.metrics.avg_bitrate_kbps?.toFixed(0)} kbps` : '—'],
              ['Min Bitrate', result.metrics.min_bitrate_kbps ? `${result.metrics.min_bitrate_kbps} kbps` : '—'],
              ['Max Bitrate', result.metrics.max_bitrate_kbps ? `${result.metrics.max_bitrate_kbps} kbps` : '—'],
              ['Error Count', result.metrics.error_count],
              ['Rebuffering Ratio', result.metrics.rebuffering_ratio != null ? `${(result.metrics.rebuffering_ratio * 100).toFixed(2)}%` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{k}</div>
                <div style={monoStyle}>{v ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.events && (
        <div style={blockStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Playback Event Log ({result.events.length})</div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Time', 'Event', 'Position', 'Bitrate', 'Buffer', 'Error'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.events.map((ev, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '7px 12px', color: ev.event_type === 'error' ? 'var(--danger)' : ev.event_type === 'buffer_start' ? 'var(--warning)' : 'var(--accent)' }}>{ev.event_type}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{ev.playback_position_ms != null ? `${ev.playback_position_ms}ms` : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{ev.bitrate_kbps ? `${ev.bitrate_kbps}k` : '—'}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{ev.buffer_level_ms != null ? `${ev.buffer_level_ms}ms` : '—'}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--danger)', fontSize: 11 }}>{ev.error_code || '—'}</td>
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
