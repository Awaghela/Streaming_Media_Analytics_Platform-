import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSessions } from '../utils/api'

const qoeBadge = (score) => {
  if (score == null) return <span className="badge badge-accent">—</span>
  if (score >= 80) return <span className="badge badge-green">{score.toFixed(1)}</span>
  if (score >= 60) return <span className="badge badge-amber">{score.toFixed(1)}</span>
  return <span className="badge badge-red">{score.toFixed(1)}</span>
}

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState('')
  const [page, setPage] = useState(0)
  const limit = 30

  const load = () => {
    setLoading(true)
    fetchSessions({ skip: page * limit, limit, network_type: network || undefined })
      .then(data => { setSessions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, network])

  const NETWORKS = ['', 'wifi', '4g', '5g', '3g', 'ethernet']

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="page-title">Sessions</div>
          <div className="page-subtitle">Individual playback session records</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            value={network}
            onChange={e => { setNetwork(e.target.value); setPage(0) }}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              padding: '6px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {NETWORKS.map(n => <option key={n} value={n}>{n || 'All Networks'}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▤</div>
            No sessions found. Try ingesting some data first.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Content</th>
                <th>Network</th>
                <th>Device</th>
                <th>CDN</th>
                <th>Country</th>
                <th>QoE Score</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.session_id}>
                  <td>
                    <Link
                      to={`/sessions/${s.session_id}`}
                      style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    >
                      {s.session_id}
                    </Link>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text)', fontSize: 13 }}>{s.content_title || '—'}</div>
                    <div className="mono">{s.content_id}</div>
                  </td>
                  <td><span className="badge badge-accent">{s.network_type || '—'}</span></td>
                  <td className="mono">{s.device_type || '—'}</td>
                  <td className="mono">{s.cdn || '—'}</td>
                  <td className="mono">{s.country || '—'}</td>
                  <td>{qoeBadge(s.metrics?.qoe_score)}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
          ← Prev
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', padding: '7px 12px' }}>
          Page {page + 1}
        </span>
        <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} disabled={sessions.length < limit}>
          Next →
        </button>
      </div>
    </div>
  )
}
