import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const safeFormat = (label) => {
  if (!label) return ''
  const d = new Date(label)
  if (isNaN(d.getTime())) return String(label)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }}>
        {safeFormat(label)}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 12, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function TimeSeriesPage({ timeseries }) {
  const data = (timeseries || []).map(d => {
    const d2 = new Date(d.timestamp)
    return {
      ...d,
      label: isNaN(d2.getTime()) ? String(d.timestamp) : d2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      startup_s: d.avg_startup_delay_ms ? +(d.avg_startup_delay_ms / 1000).toFixed(2) : null,
      buffering_s: d.avg_buffering_ms ? +(d.avg_buffering_ms / 1000).toFixed(2) : null,
    }
  })

  const chartStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 20 }

  if (!data.length) return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Time Series</h1>
      <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>No time series data available.</div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Time Series</h1>
      <div style={chartStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>QoE Score Over Time</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="avg_qoe_score" stroke="#22d3a5" strokeWidth={2} dot={false} name="QoE Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={chartStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Startup Delay & Buffering (seconds)</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="startup_s" stroke="#00e5ff" strokeWidth={2} dot={false} name="Startup (s)" />
            <Line type="monotone" dataKey="buffering_s" stroke="#f43f5e" strokeWidth={2} dot={false} name="Buffering (s)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={chartStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Avg Bitrate (kbps) & Sessions</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="br" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="sess" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="br" type="monotone" dataKey="avg_bitrate_kbps" stroke="#a78bfa" strokeWidth={2} dot={false} name="Bitrate (kbps)" />
            <Line yAxisId="sess" type="monotone" dataKey="session_count" stroke="#6b7280" strokeWidth={1.5} dot={false} name="Sessions" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
