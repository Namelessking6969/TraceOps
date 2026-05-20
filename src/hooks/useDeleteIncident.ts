import { useRef } from 'react'
import { useStore } from '../store'
import { deleteIncident } from '../db'
import type { Incident } from '../types'

export function useDeleteIncident() {
  const { removeIncident, addIncident, showToast } = useStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDelete(incident: Incident) {
    if (timerRef.current !== null) return  // already pending deletion
    removeIncident(incident.id)

    timerRef.current = setTimeout(async () => {
      try {
        await deleteIncident(incident.id)
      } catch {
        showToast('Failed to delete incident — please try again', 'error')
      }
    }, 5000)

    showToast('Incident deleted', 'success', () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      addIncident(incident)
    })
  }

  return { handleDelete }
}
