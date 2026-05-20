import { useState, useEffect, useRef } from 'react'
import { useStore }             from '../store'
import { useDeleteIncident }    from '../hooks/useDeleteIncident'
import { DeleteIncidentModal }  from './DeleteIncidentModal'
import type { Incident } from '../types'

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-yellow-400', high: 'bg-orange-400', critical: 'bg-red-500',
}

export function IncidentItem({ incident }: { incident: Incident }) {
  const { selectedIncidentId, selectIncident } = useStore()
  const { handleDelete } = useDeleteIncident()
  const isSelected = selectedIncidentId === incident.id
  const isActive   = incident.status === 'active'
  const isClosed   = incident.status === 'closed'

  const [showConfirm, setShowConfirm] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent) {
    if (!isClosed) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  function openConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    setContextMenu(null)
    setShowConfirm(true)
  }

  function onConfirmDelete() {
    setShowConfirm(false)
    handleDelete(incident)
  }

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => selectIncident(incident.id)}
          onContextMenu={handleContextMenu}
          className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors border ${
            isSelected
              ? 'bg-blue-950 border-blue-700'
              : 'hover:bg-slate-800 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />}
            <span className={`text-sm font-medium truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
              {incident.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>{isActive ? 'Active' : 'Closed'}</span>
            {incident.severity && (
              <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[incident.severity]}`} />
            )}
          </div>
        </button>

        {isClosed && (
          <button
            onClick={openConfirm}
            title="Delete incident"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
          className="z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[120px]"
        >
          <button
            onClick={openConfirm}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {showConfirm && (
        <DeleteIncidentModal
          incidentTitle={incident.title}
          onClose={() => setShowConfirm(false)}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}
