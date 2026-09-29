import { create } from 'zustand'
import { getTwin, getAlerts, getFieldSnapshot, createTelemetryStream } from '../services/api'

interface WellStore {
  selectedWell: string
  twin: Record<string, unknown> | null
  fieldSnapshot: Record<string, unknown> | null
  alerts: unknown[]
  liveTelemetry: Record<string, unknown> | null
  isStreaming: boolean
  loading: boolean

  setWell: (id: string) => void
  fetchTwin: () => Promise<void>
  fetchField: () => Promise<void>
  fetchAlerts: () => Promise<void>
  startStreaming: () => () => void
}

export const useWellStore = create<WellStore>((set, get) => ({
  selectedWell: 'BGW-01',
  twin: null,
  fieldSnapshot: null,
  alerts: [],
  liveTelemetry: null,
  isStreaming: false,
  loading: false,

  setWell: (id) => { set({ selectedWell: id, twin: null, alerts: [] }); get().fetchTwin(); },

  fetchTwin: async () => {
    set({ loading: true })
    try {
      const data = await getTwin(get().selectedWell)
      set({ twin: data, loading: false })
    } catch { set({ loading: false }) }
  },

  fetchField: async () => {
    try {
      const data = await getFieldSnapshot()
      set({ fieldSnapshot: data })
    } catch {}
  },

  fetchAlerts: async () => {
    try {
      const data = await getAlerts(get().selectedWell)
      set({ alerts: data.alerts || [] })
    } catch {}
  },

  startStreaming: () => {
    set({ isStreaming: true })
    const cleanup = createTelemetryStream(get().selectedWell, (data) => {
      set({ liveTelemetry: data })
    })
    return () => { cleanup(); set({ isStreaming: false }) }
  }
}))
