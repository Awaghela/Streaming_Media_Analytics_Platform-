import React, { useState } from 'react'
import { ingestCdnLog, ingestJsonLog, computeAllMetrics } from '../utils/api'

export default function Ingest() {
  const [cdnFile, setCdnFile]     = useState(null)
  const [jsonFile, setJsonFile]   = useState(null)
  const [cdnResult, setCdnResult] = useState(null)
  const [jsonResult, setJsonResult] = useState(null)
  const [loading, setLoading]     = useState('')
  const [error, setError]         = useState('')
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeResult, setRecomputeResult] = useState(null)

  const handleCdnUpload = async () => {
    if (!cdnFile) return
    setLoading('cdn'); setError('')
    try {
      const r = await ingestCdnLog(cdnFile)
      setCdnResult(r)
    } catch (e) {
      setError(e?.response?.data?.detail || 'CDN log ingest failed')
    } finally { setLoading('') }
  }

  const handleJsonUpload = async () => {
    if (!jsonFile) return
    setLoading('json'); setError('')
    try {
      const r = await ingestJsonLog(jsonFile)
      setJsonResult(r)
    } catch (e) {
      setError(e?.response?.data?.detail || 'JSON log ingest failed')
    } finally { setLoading('') }
  }

  const handleRecompute = async () => {
    setRecomputing(true); setError('')
    try {
      const r = await computeAllMetrics()
      setRecomputeResult(r)
    } catch (e) {
      setError('Recompute failed')
    } finally { setRecomputing(false) }
  }

  const exampleCdnLog = `# DASH CDN Access Log
2025-08-15T10:00:00Z session=sess_abc123 type=session_start
2025-08-15T10:00:00Z session=sess_abc123 type=manifest_load url=/dash/manifest.mpd load_time_ms=120
2025-08-15T10:00:01Z session=sess_abc123 type=play playback_time=0
2025-08-15T10:00:05Z session=sess_abc123 type=segment_load url=/dash/video/seg-001.m4s duration=4.0 load_time_ms=45 bitrate=1500 buffer=8.2 playback_time=4
2025-08-15T10:00:09Z session=sess_abc123 type=bitrate_change bitrate=3000 buffer=12.0 playback_time=8
2025-08-15T10:00:13Z session=sess_abc123 type=buffer_start playback_time=12 buffer=0
2025-08-15T10:00:16Z session=sess_abc123 type=buffer_end playback_time=12 buffer=4.5
2025-08-15T10:00:30Z session=sess_abc123 type=session_end playback_time=240`

  const exampleJsonLog = JSON.stringify([
    { sessionId: 'sess_xyz789', type: 'session_start', wallClockTime: 1723716000000 },
    { sessionId: 'sess_xyz789', type: 'manifest_load', wallClockTime: 1723716000200, segmentLoadTime: 200 },
    { sessionId: 'sess_xyz789', type: 'play', wallClockTime: 1723716002000, playbackTime: 0 },
    { sessionId: 'sess_xyz789', type: 'segment_load', wallClockTime: 1723716002500, playbackTime: 4, bitrate: 3000, bufferLevel: 10.2, segmentDuration: 4, segmentLoadTime: 80 },
    { sessionId: 'sess_xyz789', type: 'bitrate_change', wallClockTime: 1723716006500, playbackTime: 8, bitrate: 5000, bufferLevel: 14.0 },
    { sessionId: 'sess_xyz789', type: 'error', wallClockTime: 1723716010000, errorCode: '404', errorMessage: 'Segment not found', playbackTime: 12 },
    { sessionId: 'sess_xyz789', type: 'session_end', wallClockTime: 1723716240000, playbackTime: 300 },
  ], null, 2)

  const downloadExample = (content, filename, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Ingest</div>
        <div className="page-subtitle">Upload DASH streaming logs for analysis</div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* CDN Log */}
        <div className="card">
          <div className="card-title">◈ CDN Access Log</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Upload server-side CDN access logs in space-separated text format.
            Each line contains a session ID, event type, and optional metrics.
          </p>
          <label className={`upload-zone ${cdnFile ? 'drag-over' : ''}`} htmlFor="cdn-input">
            <input
              id="cdn-input"
              type="file"
              accept=".log,.txt"
              onChange={e => { setCdnFile(e.target.files[0]); setCdnResult(null) }}
            />
            {cdnFile ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{cdnFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{(cdnFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⬆</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Drop CDN log here or click to browse</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>.log or .txt</div>
              </div>
            )}
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleCdnUpload} disabled={!cdnFile || loading === 'cdn'}>
              {loading === 'cdn' ? '⟳ Uploading…' : '⬆ Ingest CDN Log'}
            </button>
            <button className="btn btn-ghost" onClick={() => downloadExample(exampleCdnLog, 'example_cdn.log')}>
              ↓ Example
            </button>
          </div>
          {cdnResult && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>
                ✓ Imported {cdnResult.sessions_imported} sessions · {cdnResult.events_imported} events
              </div>
            </div>
          )}
        </div>

        {/* JSON Log */}
        <div className="card">
          <div className="card-title">◈ JSON Player Log</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Upload JSON event logs from client-side players like dash.js, Shaka Player, or Video.js analytics plugins.
          </p>
          <label className={`upload-zone ${jsonFile ? 'drag-over' : ''}`} htmlFor="json-input">
            <input
              id="json-input"
              type="file"
              accept=".json"
              onChange={e => { setJsonFile(e.target.files[0]); setJsonResult(null) }}
            />
            {jsonFile ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{jsonFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{(jsonFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⬆</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Drop JSON log here or click to browse</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>.json</div>
              </div>
            )}
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleJsonUpload} disabled={!jsonFile || loading === 'json'}>
              {loading === 'json' ? '⟳ Uploading…' : '⬆ Ingest JSON Log'}
            </button>
            <button className="btn btn-ghost" onClick={() => downloadExample(exampleJsonLog, 'example_events.json', 'application/json')}>
              ↓ Example
            </button>
          </div>
          {jsonResult && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>
                ✓ Imported {jsonResult.sessions_imported} sessions · {jsonResult.events_imported} events
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recompute */}
      <div className="card">
        <div className="card-title">⟳ Recompute All Metrics</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Trigger a full recompute of QoE metrics for all sessions in the database.
          This is useful after updating the scoring algorithm or importing historical data.
        </p>
        <button className="btn btn-ghost" onClick={handleRecompute} disabled={recomputing}>
          {recomputing ? '⟳ Recomputing…' : '⟳ Recompute All Sessions'}
        </button>
        {recomputeResult && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' }}>
              ✓ Computed metrics for {recomputeResult.computed} sessions
            </div>
          </div>
        )}
      </div>

      {/* Log format reference */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">◎ CDN Log Format Reference</div>
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-dim)',
          background: 'var(--surface2)',
          padding: 16,
          borderRadius: 8,
          overflowX: 'auto',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}>
{`# Fields (space-separated, all optional except timestamp, session, type)
<ISO8601_TIMESTAMP> session=<SESSION_ID> type=<EVENT_TYPE> \\
  [url=<URL>] [duration=<SECONDS>] [load_time_ms=<MS>] \\
  [status=<HTTP_STATUS>] [bitrate=<KBPS>] [buffer=<SECONDS>] \\
  [playback_time=<SECONDS>] [error=<ERROR_CODE>]

# Supported event types:
#   session_start, session_end, manifest_load, play, pause,
#   buffer_start, buffer_end, bitrate_change, segment_load, error, seek`}
        </pre>
      </div>
    </div>
  )
}
