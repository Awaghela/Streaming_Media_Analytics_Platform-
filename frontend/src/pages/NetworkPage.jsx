
import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const NC_COLORS = { excellent: 'var(--success)', good: 'var(--accent)', fair: 'var(--warning)', poor: 'var(--danger)' }

export default function NetworkPage({ networkBreakdown }) {
  const data = networkBreakdown.sort((a, b) => {
    const order = ['excellent', 'good', 'fair', 'poor']
    return order.indexOf(a.network_condition) - order.indexOf(b.network_condition)
  })

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Network QoE Breakdown</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {data.map(d => (
          <div key={d.network_condition} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20,
            borderTop: `3px solid ${NC_COLORS[d.network_condition] || 'var(--muted)'}`,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: NC_COLORS[d.network_condition], letterSpacing: 1, marginBottom: 12 }}>
              {(d.network_condition || '').toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: NC_COLORS[d.network_condition], marginBottom: 4 }}>
              {d.avg_qoe_score?.toFixed(1) ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>QoE Score</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Startup</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {d.avg_startup_delay_ms ? `${(d.avg_startup_delay_ms/1000).toFixed(1)}s` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Buffering</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {d.avg_buffering_ms ? `${(d.avg_buffering_ms/1000).toFixed(1)}s` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Sessions</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{d.session_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>QoE Score by Network Condition</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="network_condition" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--muted)' }} itemStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="avg_qoe_score" radius={[4, 4, 0, 0]} name="QoE Score">
              {data.map(d => <Cell key={d.network_condition} fill={NC_COLORS[d.network_condition] || 'var(--muted)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Startup Delay by Network Condition (seconds)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="network_condition" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--muted)' }} itemStyle={{ color: 'var(--text)' }}
              formatter={v => [`${(v/1000).toFixed(2)}s`]} />
            <Bar dataKey="avg_startup_delay_ms" radius={[4, 4, 0, 0]} name="Startup Delay (ms)">
              {data.map(d => <Cell key={d.network_condition} fill={NC_COLORS[d.network_condition] || 'var(--muted)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
