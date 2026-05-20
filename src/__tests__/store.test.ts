import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import type { Incident, Entry } from '../types'

const makeIncident = (id: string, status: 'active' | 'closed' = 'closed'): Incident => ({
  id,
  title: `Incident ${id}`,
  status,
  severity: null,
  started_at: Date.now(),
  closed_at: status === 'closed' ? Date.now() : null,
  notes: null,
})

const makeEntry = (id: string, incident_id: string): Entry => ({
  id,
  incident_id,
  type: 'note',
  content: 'x',
  file_path: null,
  file_size: null,
  created_at: Date.now(),
})

beforeEach(() => {
  useStore.setState({ incidents: [], selectedIncidentId: null, entries: [], toast: null })
})

describe('removeIncident', () => {
  it('removes the incident from the list', () => {
    useStore.setState({ incidents: [makeIncident('1'), makeIncident('2')] })
    useStore.getState().removeIncident('1')
    const { incidents } = useStore.getState()
    expect(incidents).toHaveLength(1)
    expect(incidents[0].id).toBe('2')
  })

  it('clears selection and entries when removing the selected incident', () => {
    useStore.setState({
      incidents: [makeIncident('1')],
      selectedIncidentId: '1',
      entries: [makeEntry('e1', '1')],
    })
    useStore.getState().removeIncident('1')
    const state = useStore.getState()
    expect(state.selectedIncidentId).toBeNull()
    expect(state.entries).toHaveLength(0)
  })

  it('does not clear selection when removing a different incident', () => {
    useStore.setState({
      incidents: [makeIncident('1'), makeIncident('2')],
      selectedIncidentId: '1',
    })
    useStore.getState().removeIncident('2')
    expect(useStore.getState().selectedIncidentId).toBe('1')
  })
})
