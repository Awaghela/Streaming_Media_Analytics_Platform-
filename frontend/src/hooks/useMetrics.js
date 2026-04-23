import { useState, useEffect, useCallback } from 'react'
import { fetchAggregate, fetchTimeseries, fetchNetworkBreakdown, fetchSessions, fetchHealth } from '../utils/api'
import { mockAggregate, mockTimeseries, mockNetworkBreakdown, mockSessions } from '../utils/mockData'

export function useMetrics(hours = 24) {
  const [data, setData] = useState({
    aggregate: null, timeseries: [], networkBreakdown: [],
    sessions: [], loading: true, error: null, demoMode: false,
  })
  const load = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      await fetchHealth()
      const [agg, ts, nb, sess] = await Promise.all([
        fetchAggregate(hours), fetchTimeseries(hours),
        fetchNetworkBreakdown(), fetchSessions({ limit: 50 }),
      ])
      setData({ aggregate: agg.data, timeseries: ts.data, networkBreakdown: nb.data,
        sessions: sess.data, loading: false, error: null, demoMode: false })
    } catch {
      setData({ aggregate: mockAggregate, timeseries: mockTimeseries,
        networkBreakdown: mockNetworkBreakdown, sessions: mockSessions,
        loading: false, error: null, demoMode: true })
    }
  }, [hours])
  useEffect(() => { load() }, [load])
  return { ...data, refresh: load }
}
