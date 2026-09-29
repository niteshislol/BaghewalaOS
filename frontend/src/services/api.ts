import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// ── Field ──────────────────────────────────────────────────────────────────
export const getFieldSnapshot = () => api.get('/field/snapshot').then(r => r.data)
export const listWells = () => api.get('/field/wells').then(r => r.data)

// ── Twin ──────────────────────────────────────────────────────────────────
export const getTwin = (wellId: string) => api.get(`/wells/${wellId}/twin`).then(r => r.data)
export const getPhysics = (wellId: string) => api.get(`/wells/${wellId}/physics`).then(r => r.data)
export const getTwinState = (wellId: string) => api.get(`/wells/${wellId}/twin/state`).then(r => r.data)
export const twinAdvance = (wellId: string, days = 1) => api.post(`/wells/${wellId}/twin/advance`, null, { params: { days } }).then(r => r.data)
export const twinReset = (wellId: string) => api.post(`/wells/${wellId}/twin/reset`).then(r => r.data)
export const twinPreview = (wellId: string, patch: Record<string, unknown>) => api.post(`/wells/${wellId}/twin/preview`, patch).then(r => r.data)

// ── Intelligence ──────────────────────────────────────────────────────────
export const diagnoseWell = (wellId: string) => api.get(`/wells/${wellId}/diagnosis`).then(r => r.data)
export const getAlerts = (wellId: string) => api.get(`/wells/${wellId}/alerts`).then(r => r.data)
export const getVFD = (wellId: string) => api.get(`/wells/${wellId}/vfd`).then(r => r.data)
export const applyVFD = (wellId: string) => api.post(`/wells/${wellId}/vfd/apply`).then(r => r.data)
export const getMaintenance = (wellId: string) => api.get(`/wells/${wellId}/maintenance`).then(r => r.data)

// ── Optimization ──────────────────────────────────────────────────────────
export const optimizeWell = (wellId: string) => api.post(`/wells/${wellId}/optimize`).then(r => r.data)
export const whatIf = (wellId: string, delta: Record<string, number>) =>
  api.post(`/wells/${wellId}/whatif`, { well_id: wellId, delta }).then(r => r.data)
export const compareHorizons = (wellId: string, days = 90) =>
  api.get(`/wells/${wellId}/compare`, { params: { days } }).then(r => r.data)
export const simulateHorizon = (wellId: string, days = 90, useOptimized = false) =>
  api.get(`/wells/${wellId}/horizon`, { params: { days, use_optimized: useOptimized } }).then(r => r.data)
export const getFutureBranches = (wellId: string, days = 90) =>
  api.get(`/wells/${wellId}/branches`, { params: { horizon_days: days } }).then(r => r.data)

// ── Simulation Controls ───────────────────────────────────────────────────
export const cycleForward = (wellId: string, days = 1) =>
  api.post(`/wells/${wellId}/forward`, null, { params: { days } }).then(r => r.data)
export const injectFault = (wellId: string, fault: string | null) =>
  api.post(`/wells/${wellId}/fault`, null, { params: { fault } }).then(r => r.data)
export const recordObservation = (wellId: string, observedOil: number) =>
  api.post(`/wells/${wellId}/observe`, null, { params: { observed_oil: observedOil } }).then(r => r.data)

// ── AI Copilot ────────────────────────────────────────────────────────────
export const aiChat = (payload: {
  well_id: string
  message: string
  role?: string
  history?: { role: string; content: string }[]
  twin_context?: Record<string, unknown>
  current_page?: string
}) => api.post('/copilot/chat', payload).then(r => r.data)

// ── Telemetry ─────────────────────────────────────────────────────────────
export const getTelemetryStats = () => api.get('/telemetry/stats').then(r => r.data)
export const getModelMetrics = () => api.get('/models/metrics').then(r => r.data)

// ── ORIGIN ML integration ────────────────────────────────────────────────
export const getOriginPrediction = (wellId: string) => api.get(`/wells/${wellId}/ml/origin`).then(r => r.data)
export const getOriginExplainability = (wellId: string) => api.get(`/wells/${wellId}/ml/explainability`).then(r => r.data)
export const runOriginOptimization = (wellId: string) => api.post(`/wells/${wellId}/ml/optimize`).then(r => r.data)
export const replayScenario = (wellId: string, days = 30, strategy = 'balanced') =>
  api.get(`/wells/${wellId}/replay`, { params: { days, strategy } }).then(r => r.data)

// ── Audit ─────────────────────────────────────────────────────────────────
export const getAuditLogs = (wellId?: string, limit = 50) =>
  api.get('/audit/logs', { params: { well_id: wellId, limit } }).then(r => r.data)
export const dispatchAction = (wellId: string, eventId: string, action: string, priority = 'STANDARD') =>
  api.post('/action/dispatch', { well_id: wellId, event_id: eventId, action, priority }).then(r => r.data)

// ── SSE Stream helper ─────────────────────────────────────────────────────
export function createTelemetryStream(wellId: string, onData: (d: Record<string, unknown>) => void) {
  const es = new EventSource(`/api/v1/telemetry/stream?well_id=${wellId}`)
  es.onmessage = (e) => {
    try { onData(JSON.parse(e.data)) } catch {}
  }
  return () => es.close()  // cleanup function
}

export default api
