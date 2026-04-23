import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { fetchSummary, fetchQoeTrend, fetchBufferingByNetwork, fetchPerformanceByContent } from '../utils/api'

const COLORS = ['#00e5ff', '#22d3a5', '#a78bfa', '#f59e0b', '#f43f5e']

function MetricTile({ label, value, sub, color = 'accent' }) {
  return (
    <div className={`metric-tile ${color}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${color}`}>{value ?? '—'}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border-bright)',
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary]   = useState(null)
  const [trend, setTrend]       = useState([])
  const [buffering, setBuffering] = useState([])
  const [content, setContent]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      fetchSummary().catch(() => null),
      fetchQoeTrend(14).catch(() => []),
      fetchBufferingByNetwork().catch(() => []),
      fetchPerformanceByContent().catch(() => []),
    ]).then(([s, t, b, c]) => {
      setSummary(s)
      setTrend(t)
      setBuffering(b)
      setContent(c.slice(0, 8))
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="page">
      <div className="loading"><div className="spinner" /> Loading metrics…</div>
    </div>
  )

  const qoeColor = (score) => {
    if (score >= 80) return 'green'
    if (score >= 60) return 'amber'
    return 'red'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Overview</div>
        <div className="page-subtitle">Platform-wide QoE metrics across all streaming sessions</div>
      </div>

      <div className="metrics-grid">
        <MetricTile
          label="Total Sessions"
          value={summary?.total_sessions?.toLocaleString() ?? 0}
          sub="all time"
          color="accent"
        />
        <MetricTile
          label="Avg QoE Score"
          value={summary?.avg_qoe_score != null ? summary.avg_qoe_score.toFixed(1) : '—'}
          sub="out of 100"
          color={qoeColor(summary?.avg_qoe_score)}
        />
        <MetricTile
          label="Avg Startup Delay"
          value={summary?.avg_startup_delay_ms != null ? `${(summary.avg_startup_delay_ms / 1000).toFixed(2)}s` : '—'}
          sub="time to first frame"
          color="amber"
        />
        <MetricTile
          label="Avg Buffering"
          value={summary?.avg_buffering_duration_ms != null ? `${(summary.avg_buffering_duration_ms / 1000).toFixed(1)}s` : '—'}
          sub="per session"
          color="red"
        />
        <MetricTile
          label="Bitrate Switches"
          value={summary?.avg_bitrate_switches != null ? summary.avg_bitrate_switches.toFixed(1) : '—'}
          sub="avg per session"
          color="purple"
        />
        <MetricTile
          label="Avg Error Count"
          value={summary?.avg_errors != null ? summary.avg_errors.toFixed(2) : '—'}
          sub="per session"
          color="red"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">◈ QoE Score — 14-day trend</div>
          {trend.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="qoeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avg_qoe_score" name="QoE Score" stroke="#00e5ff" fill="url(#qoeGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">◌</div>No trend data yet</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">▤ Buffering by Network Type</div>
          {buffering.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart data={buffering} layout="vertical">
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                  <YAxis type="category" dataKey="network_type" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_buffering_ms" name="Avg Buffering (ms)" radius={[0, 4, 4, 0]}>
                    {buffering.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">◌</div>No network data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">◉ Performance by Content</div>
        {content.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Content</th>
                <th>QoE Score</th>
                <th>Avg Startup</th>
                <th>Avg Buffering</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {content.map((c) => (
                <tr key={c.content_id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{c.content_title || c.content_id}</div>
                    <div className="mono">{c.content_id}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${qoeColor(c.avg_qoe_score)}`}>
                      {c.avg_qoe_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="mono">{c.avg_startup_ms ? `${(c.avg_startup_ms / 1000).toFixed(2)}s` : '—'}</td>
                  <td className="mono">{c.avg_buffering_ms ? `${(c.avg_buffering_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="mono">{c.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">◌</div>No content data yet</div>
        )}
      </div>
    </div>
  )
}
