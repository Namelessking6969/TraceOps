import { create } from 'zustand'
import type { Incident, Entry } from './types'

interface Toast {
  id: string
  message: string
  type: 'error' | 'success'
}

interface AppStore {
  incidents: Incident[]
  selectedIncidentId: string | null
  entries: Entry[]
  toast: Toast | null

  setIncidents: (incidents: Incident[]) => void
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  selectIncident: (id: string | null) => void
  setEntries: (entries: Entry[]) => void
  addEntry: (entry: Entry) => void
  showToast: (message: string, type: 'error' | 'success') => void
  clearToast: () => void
}

export const useStore = create<AppStore>((set) => ({
  incidents:            [],
  selectedIncidentId:   null,
  entries:              [],
  toast:                null,

  setIncidents: (incidents) => set({ incidents }),

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  updateIncident: (id, patch) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  selectIncident: (id) => set({ selectedIncidentId: id, entries: [] }),

  setEntries: (entries) => set({ entries }),

  addEntry: (entry) =>
    set((s) => ({ entries: [...s.entries, entry] })),

  showToast: (message, type) =>
    set({ toast: { id: String(Date.now()), message, type } }),

  clearToast: () => set({ toast: null }),
}))
