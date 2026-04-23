import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { fetchSession, fetchSessionMetrics, fetchSessionEvents, computeMetrics } from '../utils/api'

const EV_COLORS = {
  play: 'var(--green)',
  pause: 'var(--text-muted)',
  buffer_start: 'var(--red)',
  buffer_end: 'var(--green)',
  bitrate_change: 'var(--accent)',
  error: 'var(--red)',
  session_start: 'var(--purple)',
  session_end: 'var(--purple)',
  seek: 'var(--amber)',
  segment_load: 'var(--border-bright)',
  manifest_load: 'var(--accent)',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</div>)}
    </div>
  )
}

export default function SessionDetail() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchSession(sessionId).catch(() => null),
      fetchSessionMetrics(sessionId).catch(() => null),
      fetchSessionEvents(sessionId, { limit: 300 }).catch(() => []),
    ]).then(([s, m, e]) => {
      setSession(s); setMetrics(m); setEvents(e); setLoading(false)
    })
  }, [sessionId])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const m = await computeMetrics(sessionId)
      setMetrics(m)
    } finally { setComputing(false) }
  }

  // Build buffer-level timeline for chart
  const bufferTimeline = events
    .filter(e => e.buffer_level != null)
    .map(e => ({ t: e.playback_time?.toFixed(0) ?? '0', buffer: e.buffer_level, bitrate: (e.bitrate ?? 0) / 1000 }))
    .slice(0, 150)

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Loading session…</div></div>
  if (!session) return <div className="page"><div className="loading">Session not found</div></div>

  const qoeColor = (s) => s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red'

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/sessions" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              ← Sessions
            </Link>
            <span style={{ color: 'var(--border-bright)' }}>/</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{sessionId}</span>
          </div>
          <div className="page-title" style={{ marginTop: 8 }}>Session Detail</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={handleCompute} disabled={computing}>
            {computing ? '⟳ Computing…' : '⟳ Recompute QoE'}
          </button>
        </div>
      </div>

      {/* Session info + QoE summary */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">▤ Session Info</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Content', session.content_title || session.content_id || '—'],
                ['Network', session.network_type || '—'],
                ['Device', session.device_type || '—'],
                ['Browser', session.browser || '—'],
                ['OS', session.os || '—'],
                ['CDN', session.cdn || '—'],
                ['Country', session.country || '—'],
                ['Player', session.player_version || '—'],
                ['Started', session.started_at ? new Date(session.started_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', width: 130 }}>{k}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text)', fontSize: 13 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">◈ QoE Metrics</div>
          {metrics ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['QoE Score', metrics.qoe_score != null ? metrics.qoe_score.toFixed(1) : '—', qoeColor(metrics.qoe_score)],
                ['Startup Delay', metrics.startup_delay_ms != null ? `${(metrics.startup_delay_ms/1000).toFixed(2)}s` : '—', 'amber'],
                ['Total Buffering', metrics.total_buffering_duration_ms != null ? `${(metrics.total_buffering_duration_ms/1000).toFixed(1)}s` : '—', 'red'],
                ['Buffer Events', metrics.buffering_events_count ?? '—', 'red'],
                ['Bitrate Switches', metrics.bitrate_switches_count ?? '—', 'purple'],
                ['Avg Bitrate', metrics.average_bitrate_kbps != null ? `${metrics.average_bitrate_kbps.toFixed(0)} kbps` : '—', 'accent'],
                ['Watch Time', metrics.total_watch_time_s != null ? `${(metrics.total_watch_time_s/60).toFixed(1)} min` : '—', 'green'],
                ['Errors', metrics.error_count ?? '—', 'red'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: `var(--${color})` }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">◌</div>
              <div>No metrics computed yet</div>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleCompute}>Compute Now</button>
            </div>
          )}
        </div>
      </div>

      {/* Buffer + bitrate timeline */}
      {bufferTimeline.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">◎ Buffer Level Timeline</div>
            <div className="chart-wrap">
              <ResponsiveContainer>
                <AreaChart data={bufferTimeline}>
                  <defs>
                    <linearGradient id="bufGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3a5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3a5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} label={{ value: 'playback (s)', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 9 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="buffer" name="Buffer (s)" stroke="#22d3a5" fill="url(#bufGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-title">◈ Bitrate Over Time</div>
            <div className="chart-wrap">
              <ResponsiveContainer>
                <AreaChart data={bufferTimeline}>
                  <defs>
                    <linearGradient id="brGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="stepAfter" dataKey="bitrate" name="Bitrate (Mbps)" stroke="#00e5ff" fill="url(#brGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Event timeline */}
      <div className="card">
        <div className="card-title">▤ Playback Events ({events.length})</div>
        {events.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">◌</div>No events recorded</div>
        ) : (
          <div className="timeline" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {events.map((ev, i) => (
              <div key={i} className="timeline-event">
                <div className="ev-dot" style={{ background: EV_COLORS[ev.event_type] || 'var(--border-bright)' }} />
                <span className="ev-time">
                  {ev.playback_time != null ? `${ev.playback_time.toFixed(1)}s` : '—'}
                </span>
                <span className="ev-type" style={{ color: EV_COLORS[ev.event_type] || 'var(--text)' }}>
                  {ev.event_type}
                </span>
                <span className="ev-detail">
                  {ev.bitrate ? `${ev.bitrate} kbps` : ''}
                  {ev.buffer_level != null ? ` buf:${ev.buffer_level.toFixed(1)}s` : ''}
                  {ev.error_code ? ` ⚠ ${ev.error_code}` : ''}
                  {ev.segment_load_time ? ` load:${ev.segment_load_time.toFixed(0)}ms` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
