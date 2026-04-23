
import React from 'react'
import StatCard from '../components/dashboard/StatCard'
import QoEGauge from '../components/charts/QoEGauge'
import SessionsTable from '../components/dashboard/SessionsTable'

function fmt(v, d = 0) { return v != null ? Number(v).toFixed(d) : '—' }
function ms(v) { return v != null ? (v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${Math.round(v)}ms`) : '—' }

export default function DashboardPage({ aggregate: agg, sessions }) {
  if (!agg) return null
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>QoE Overview</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>{agg.session_count?.toLocaleString()} sessions analyzed</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Avg QoE Score" value={fmt(agg.avg_qoe_score, 1)} unit="/ 10"
          color={agg.avg_qoe_score >= 7.5 ? 'var(--success)' : agg.avg_qoe_score >= 5 ? 'var(--warning)' : 'var(--danger)'} />
        <StatCard label="Startup Delay p50" value={ms(agg.p50_startup_ms)} subtext={`p95: ${ms(agg.p95_startup_ms)}`} color="var(--accent)" />
        <StatCard label="Buffering p50" value={ms(agg.p50_buffering_ms)} subtext={`p95: ${ms(agg.p95_buffering_ms)}`} color="var(--accent2)" />
        <StatCard label="Avg Bitrate" value={fmt(agg.avg_bitrate_kbps, 0)} unit="kbps" color="var(--accent3)" />
        <StatCard label="Rebuffering Ratio" value={fmt((agg.avg_rebuffering_ratio || 0) * 100, 2)} unit="%" color="var(--warning)" />
        <StatCard label="Error Rate" value={fmt((agg.error_rate || 0) * 100, 1)} unit="%" color="var(--danger)" />
        <StatCard label="Bitrate Switches" value={fmt(agg.avg_bitrate_switches, 1)} unit="avg/session" color="var(--muted)" />
        <StatCard label="Sessions" value={agg.session_count?.toLocaleString()} color="var(--success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12 }}>OVERALL QOE SCORE</div>
          <QoEGauge score={agg.avg_qoe_score} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 16 }}>KEY THRESHOLDS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Startup &lt; 1s', (agg.p50_startup_ms||0) < 1000, `p50: ${ms(agg.p50_startup_ms)}`],
              ['Rebuffering &lt; 1%', ((agg.avg_rebuffering_ratio||0)*100) < 1, `${fmt((agg.avg_rebuffering_ratio||0)*100,2)}%`],
              ['QoE Score &gt; 7.5', agg.avg_qoe_score >= 7.5, `Score: ${fmt(agg.avg_qoe_score,1)}`],
              ['Error Rate &lt; 2%', ((agg.error_rate||0)*100) < 2, `${fmt((agg.error_rate||0)*100,1)}%`],
            ].map(([label, pass, value]) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '14px 16px',
                borderLeft: `3px solid ${pass ? 'var(--success)' : 'var(--danger)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }} dangerouslySetInnerHTML={{__html: label}} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: pass ? 'var(--success)' : 'var(--danger)', fontSize: 16 }}>{pass ? '✓' : '✗'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Recent Sessions</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{sessions.length} shown</span>
        </div>
        <SessionsTable sessions={sessions.slice(0, 10)} />
      </div>
    </div>
  )
}
