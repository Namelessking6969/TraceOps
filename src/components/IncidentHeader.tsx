import { useState, useEffect } from 'react'
import { save }            from '@tauri-apps/plugin-dialog'
import { writeTextFile }   from '@tauri-apps/plugin-fs'
import { useStore }        from '../store'
import { closeIncident }   from '../db'
import { generateMarkdown } from '../export'
import { formatElapsed }   from '../utils/time'
import { CloseIncidentModal }  from './CloseIncidentModal'
import { DeleteIncidentModal } from './DeleteIncidentModal'
import { useDeleteIncident }   from '../hooks/useDeleteIncident'

const SEVERITY_BADGE: Record<string, string> = {
  low:      'bg-slate-700 text-slate-300',
  medium:   'bg-yellow-950 text-yellow-300',
  high:     'bg-orange-950 text-orange-300',
  critical: 'bg-red-950 text-red-300',
}

export function IncidentHeader() {
  const { selectedIncidentId, incidents, entries, updateIncident, showToast } = useStore()
  const { handleDelete } = useDeleteIncident()
  const incident = incidents.find((i) => i.id === selectedIncidentId)

  const [elapsed, setElapsed]       = useState(0)
  const [showClose, setShowClose]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [exporting, setExporting]   = useState(false)

  useEffect(() => {
    if (!incident || incident.status !== 'active') return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - incident.started_at) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [incident?.id, incident?.status, incident?.started_at])

  if (!incident) return null

  async function handleExport() {
    if (!incident) return
    setExporting(true)
    try {
      const md   = generateMarkdown(incident, entries)
      const slug = incident.title.replace(/\s+/g, '-').toLowerCase()
      const path = await save({
        defaultPath: `${slug}-incident.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (path) {
        await writeTextFile(path, md)
        showToast('Report exported', 'success')
      }
    } catch {
      showToast('Export failed — please try again', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleClose(notes: string | null) {
    if (!incident) return
    const closedAt = Date.now()
    try {
      await closeIncident(incident.id, closedAt, notes)
      updateIncident(incident.id, { status: 'closed', closed_at: closedAt, notes })
      setShowClose(false)
    } catch {
      showToast('Failed to close incident', 'error')
    }
  }

  function onConfirmDelete() {
    if (!incident) return
    setShowDelete(false)
    handleDelete(incident)
  }

  return (
    <>
      <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[var(--text-primary)]">{incident.title}</h1>
            {incident.severity && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${SEVERITY_BADGE[incident.severity]}`}>
                {incident.severity}
              </span>
            )}
            {incident.status === 'active' && (
              <span className="bg-[var(--bg-input)] text-red-400 text-xs px-2 py-0.5 rounded font-mono">
                🔴 {formatElapsed(elapsed)}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date(incident.started_at).toLocaleString('en-US')}
            {incident.status === 'closed' && incident.closed_at && (
              <> · Closed {new Date(incident.closed_at).toLocaleString('en-US')}</>
            )}
            &nbsp;· {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            Export
          </button>
          {incident.status === 'active' && (
            <button
              onClick={() => setShowClose(true)}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
            >
              Close Incident
            </button>
          )}
          {incident.status === 'closed' && (
            <button
              onClick={() => setShowDelete(true)}
              className="bg-red-900 hover:bg-red-800 border border-red-800 text-red-300 text-xs px-3 py-1.5 rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {showClose && (
        <CloseIncidentModal onClose={() => setShowClose(false)} onConfirm={handleClose} />
      )}
      {showDelete && (
        <DeleteIncidentModal
          incidentTitle={incident.title}
          onClose={() => setShowDelete(false)}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}
