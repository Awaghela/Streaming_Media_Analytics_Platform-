
import React, { useState } from 'react'
import SessionsTable from '../components/dashboard/SessionsTable'

export default function SessionsPage({ sessions }) {
  const [filter, setFilter] = useState('')
  const [nc, setNc] = useState('')

  const filtered = sessions.filter(s => {
    const matchText = !filter || (s.content_title || '').toLowerCase().includes(filter.toLowerCase()) ||
      s.session_id.includes(filter) || (s.device_type || '').toLowerCase().includes(filter.toLowerCase())
    const matchNc = !nc || s.network_condition === nc
    return matchText && matchNc
  })

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font-sans)',
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Sessions</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Search content, session ID, device…" style={{ ...inputStyle, width: 280 }} />
        <select value={nc} onChange={e => setNc(e.target.value)} style={{ ...inputStyle }}>
          <option value="">All Networks</option>
          {['excellent','good','fair','poor'].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ color: 'var(--muted)', fontSize: 12, alignSelf: 'center' }}>{filtered.length} sessions</span>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <SessionsTable sessions={filtered} />
      </div>
    </div>
  )
}
