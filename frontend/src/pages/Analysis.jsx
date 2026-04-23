import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Legend, ScatterChart, Scatter
} from 'recharts'
import {
  fetchStartupDistribution, fetchBitrateSwitches,
  fetchErrorAnalysis, fetchBufferingByNetwork
} from '../utils/api'

const COLORS = ['#00e5ff', '#22d3a5', '#a78bfa', '#f59e0b', '#f43f5e', '#64748b']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || 'var(--text)' }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</div>)}
    </div>
  )
}

export default function Analysis() {
  const [startup, setStartup]   = useState({ distribution: [] })
  const [switches, setSwitches] = useState(null)
  const [errors, setErrors]     = useState(null)
  const [buffering, setBuffering] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      fetchStartupDistribution(12).catch(() => ({ distribution: [] })),
      fetchBitrateSwitches().catch(() => null),
      fetchErrorAnalysis().catch(() => null),
      fetchBufferingByNetwork().catch(() => []),
    ]).then(([s, sw, e, b]) => {
      setStartup(s); setSwitches(sw); setErrors(e); setBuffering(b); setLoading(false)
    })
  }, [])

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Loading analysis…</div></div>

  const startupData = startup.distribution?.map(d => ({
    range: `${(d.range_ms[0] / 1000).toFixed(1)}s`,
    count: d.count,
  })) || []

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Analysis</div>
        <div className="page-subtitle">Deep-dive into streaming QoE metrics</div>
      </div>

      {/* Startup delay distribution */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">◈ Startup Delay Distribution</div>
          {startupData.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart data={startupData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="range" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Sessions" radius={[4, 4, 0, 0]}>
                    {startupData.map((_, i) => <Cell key={i} fill={i < 3 ? '#22d3a5' : i < 6 ? '#f59e0b' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">◌</div>No startup data yet</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">▤ Avg Buffering by Network</div>
          {buffering.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart data={buffering} layout="vertical">
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <YAxis type="category" dataKey="network_type" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_buffering_ms" name="Avg ms" radius={[0, 4, 4, 0]}>
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

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Bitrate switches by CDN */}
        <div className="card">
          <div className="card-title">◉ Bitrate Switches by CDN</div>
          {switches?.by_cdn?.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                {[
                  ['Avg', switches.overall?.avg?.toFixed(1)],
                  ['Max', switches.overall?.max],
                  ['Sessions', switches.overall?.total_sessions],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{k}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--purple)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="chart-wrap-sm">
                <ResponsiveContainer>
                  <BarChart data={switches.by_cdn}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="cdn" stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg_switches" name="Avg Switches" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">◌</div>No bitrate data yet</div>
          )}
        </div>

        {/* Error breakdown */}
        <div className="card">
          <div className="card-title">⚠ Error Analysis</div>
          {errors?.top_errors?.length > 0 ? (
            <>
              <div style={{ marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                Total errors: <span style={{ color: 'var(--red)' }}>{errors.total_errors}</span>
              </div>
              <div className="chart-wrap-sm">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={errors.top_errors.slice(0, 6)}
                      dataKey="count"
                      nameKey="error_code"
                      cx="50%" cy="50%"
                      outerRadius={70}
                      label={({ error_code, pct }) => `${error_code} ${pct}%`}
                      labelLine={false}
                    >
                      {errors.top_errors.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <table className="data-table" style={{ marginTop: 8 }}>
                <thead><tr><th>Error Code</th><th>Count</th><th>%</th></tr></thead>
                <tbody>
                  {errors.top_errors.slice(0, 8).map(e => (
                    <tr key={e.error_code}>
                      <td><span className="badge badge-red">{e.error_code}</span></td>
                      <td className="mono">{e.count}</td>
                      <td className="mono">{e.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">◌</div>No error data yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
