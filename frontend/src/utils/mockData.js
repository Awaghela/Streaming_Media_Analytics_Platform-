export const mockAggregate = {
  session_count: 847,
  avg_startup_delay_ms: 1840,
  avg_buffering_ms: 3200,
  avg_buffering_count: 2.3,
  avg_bitrate_switches: 4.7,
  avg_bitrate_kbps: 3450,
  avg_rebuffering_ratio: 0.024,
  avg_qoe_score: 7.4,
  error_rate: 0.08,
  p50_startup_ms: 1200,
  p95_startup_ms: 4800,
  p50_buffering_ms: 1800,
  p95_buffering_ms: 9500,
}

export const mockTimeseries = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
  avg_startup_delay_ms: 1200 + Math.sin(i * 0.4) * 800 + Math.random() * 400,
  avg_buffering_ms: 2000 + Math.sin(i * 0.3 + 1) * 1500 + Math.random() * 500,
  avg_qoe_score: 7.5 + Math.sin(i * 0.5) * 1.5 + Math.random() * 0.5,
  avg_bitrate_kbps: 3000 + Math.sin(i * 0.2) * 1500 + Math.random() * 500,
  session_count: Math.floor(20 + Math.sin(i * 0.5) * 15 + Math.random() * 10),
}))

export const mockNetworkBreakdown = [
  { network_condition: 'excellent', avg_qoe_score: 9.1, avg_startup_delay_ms: 650, avg_buffering_ms: 320, session_count: 210 },
  { network_condition: 'good', avg_qoe_score: 7.8, avg_startup_delay_ms: 1350, avg_buffering_ms: 1800, session_count: 295 },
  { network_condition: 'fair', avg_qoe_score: 5.9, avg_startup_delay_ms: 2900, avg_buffering_ms: 5200, session_count: 218 },
  { network_condition: 'poor', avg_qoe_score: 3.4, avg_startup_delay_ms: 6100, avg_buffering_ms: 14000, session_count: 124 },
]

export const mockSessions = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  session_id: `sess-${String(i + 1).padStart(4, '0')}`,
  content_title: ['Big Buck Bunny', 'Elephant Dream', 'Live Sports', 'News Broadcast', 'Tears of Steel'][i % 5],
  content_id: `vod_00${(i % 5) + 1}`,
  device_type: ['SmartTV', 'Desktop', 'Mobile', 'Tablet'][i % 4],
  network_condition: ['excellent', 'good', 'fair', 'poor'][i % 4],
  cdn: ['Akamai', 'CloudFront', 'Fastly'][i % 3],
  started_at: new Date(Date.now() - i * 3600000 * 2).toISOString(),
  total_duration_ms: 1200000 + i * 300000,
}))
