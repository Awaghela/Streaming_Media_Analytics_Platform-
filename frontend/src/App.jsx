
import React, { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import DashboardPage from './pages/DashboardPage'
import SessionsPage from './pages/SessionsPage'
import TimeSeriesPage from './pages/TimeSeriesPage'
import NetworkPage from './pages/NetworkPage'
import DebugPage from './pages/DebugPage'
import { useMetrics } from './hooks/useMetrics'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [hours, setHours] = useState(24)
  const metrics = useMetrics(hours)

  const pages = { dashboard: DashboardPage, sessions: SessionsPage,
    timeseries: TimeSeriesPage, network: NetworkPage, debug: DebugPage }
  const Page = pages[page] || DashboardPage

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={page} onNav={setPage} />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
            {metrics.demoMode && (
              <span style={{ color: 'var(--warning)', marginRight: 16 }}>◉ DEMO MODE — backend offline</span>
            )}
            Last refreshed: {new Date().toLocaleTimeString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Window:</span>
            {[6, 24, 48, 168].map(h => (
              <button key={h} onClick={() => setHours(h)} style={{
                background: hours === h ? 'var(--accent)' : 'var(--surface2)',
                color: hours === h ? '#000' : 'var(--muted)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)',
              }}>{h}h</button>
            ))}
            <button onClick={metrics.refresh} style={{
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
            }}>↻ Refresh</button>
          </div>
        </header>
        <div style={{ flex: 1, padding: 32, overflow: 'auto' }}>
          {metrics.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400,
              color: 'var(--muted)', fontFamily: 'var(--font-mono)', gap: 12 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
              Loading metrics…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : <Page {...metrics} hours={hours} />}
        </div>
      </main>
    </div>
  )
}
