import { useState } from 'react'
import { useStore }          from '../store'
import { IncidentItem }      from './IncidentItem'
import { NewIncidentModal }  from './NewIncidentModal'
import { SettingsModal }     from './SettingsModal'

export function Sidebar() {
  const incidents   = useStore((s) => s.incidents)
  const [showModal, setShowModal]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const active = incidents.filter((i) => i.status === 'active')
  const closed = incidents.filter((i) => i.status === 'closed')

  return (
    <>
      <aside className="w-52 bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            + New Incident
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {active.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1">Active</p>
              {active.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {closed.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1 mt-2">Closed</p>
              {closed.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {incidents.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] text-center mt-8 px-2">
              No incidents yet. Create one to start logging.
            </p>
          )}
        </div>
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-full flex items-center justify-center py-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </aside>
      {showModal    && <NewIncidentModal onClose={() => setShowModal(false)} />}
      {showSettings && <SettingsModal   onClose={() => setShowSettings(false)} />}
    </>
  )
}
