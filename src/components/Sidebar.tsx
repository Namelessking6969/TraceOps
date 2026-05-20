import { useState } from 'react'
import { useStore }          from '../store'
import { IncidentItem }      from './IncidentItem'
import { NewIncidentModal }  from './NewIncidentModal'

export function Sidebar() {
  const incidents   = useStore((s) => s.incidents)
  const [showModal, setShowModal] = useState(false)

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
      </aside>
      {showModal && <NewIncidentModal onClose={() => setShowModal(false)} />}
    </>
  )
}
