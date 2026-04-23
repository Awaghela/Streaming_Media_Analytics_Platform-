import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const fetchAggregate = (hours = 24) => api.get(`/metrics/aggregate?hours=${hours}`)
export const fetchTimeseries = (hours = 24) => api.get(`/metrics/timeseries?hours=${hours}&bucket_minutes=60`)
export const fetchNetworkBreakdown = () => api.get('/metrics/network-breakdown')
export const fetchSessions = (params = {}) => api.get('/sessions/', { params })
export const fetchSessionMetrics = (id) => api.get(`/metrics/session/${id}`)
export const fetchSessionEvents = (id) => api.get(`/events/${id}`)
export const fetchHealth = () => api.get('/health')

export default api
