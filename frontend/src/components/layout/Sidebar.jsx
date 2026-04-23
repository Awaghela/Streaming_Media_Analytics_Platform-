
import React from 'react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'sessions', label: 'Sessions', icon: '▤' },
  { id: 'timeseries', label: 'Time Series', icon: '◌' },
  { id: 'network', label: 'Network QoE', icon: '◎' },
  { id: 'debug', label: 'Debug View', icon: '⊞' },
]

export default function Sidebar({ active, onNav }) {
  return (
    <aside style={{
      width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
    }}>
      <div style={{ padding: '0 24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>
          DASH // QOE
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          Analytics Platform
        </div>
      </div>
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '10px 12px', marginBottom: 2, background: active === item.id ? 'var(--surface2)' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer', color: active === item.id ? 'var(--accent)' : 'var(--muted)',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            borderLeft: active === item.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        v1.0.0 · MPEG-DASH
      </div>
    </aside>
  )
}
