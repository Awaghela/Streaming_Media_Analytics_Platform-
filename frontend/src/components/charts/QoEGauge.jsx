
import React from 'react'

export default function QoEGauge({ score }) {
  const s = score ?? 0
  const pct = s / 10
  const angle = -140 + pct * 280
  const color = s >= 7.5 ? 'var(--success)' : s >= 5 ? 'var(--warning)' : 'var(--danger)'
  const r = 70, cx = 100, cy = 95
  const startAngle = -140, endAngle = 140
  const toRad = a => (a * Math.PI) / 180
  const arc = (a1, a2, r2) => {
    const x1 = cx + r2 * Math.cos(toRad(a1))
    const y1 = cy + r2 * Math.sin(toRad(a1))
    const x2 = cx + r2 * Math.cos(toRad(a2))
    const y2 = cy + r2 * Math.sin(toRad(a2))
    const large = a2 - a1 > 180 ? 1 : 0
    return ['M', x1, y1, 'A', r2, r2, 0, large, 1, x2, y2].join(' ')
  }
  const nx = cx + (r - 12) * Math.cos(toRad(angle))
  const ny = cy + (r - 12) * Math.sin(toRad(angle))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={200} height={130} viewBox="0 0 200 130">
        <path d={arc(startAngle, endAngle, r)} fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round"/>
        <path d={arc(startAngle, startAngle + pct * 280, r)} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={3} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={4} fill={color}/>
        <text x={cx} y={cy - 18} textAnchor="middle" fill={color} fontSize={26} fontWeight="700" fontFamily="'Space Mono', monospace">{s.toFixed(1)}</text>
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--muted)" fontSize={10} fontFamily="'DM Sans', sans-serif">/ 10.0 QoE Score</text>
        <text x={cx - r - 2} y={cy + 20} fill="var(--muted)" fontSize={9} textAnchor="middle">0</text>
        <text x={cx + r + 2} y={cy + 20} fill="var(--muted)" fontSize={9} textAnchor="middle">10</text>
      </svg>
    </div>
  )
}
