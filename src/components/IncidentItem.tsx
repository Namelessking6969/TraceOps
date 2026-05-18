import { useStore } from '../store'
import type { Incident } from '../types'

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-yellow-400', high: 'bg-orange-400', critical: 'bg-red-500',
}

export function IncidentItem({ incident }: { incident: Incident }) {
  const { selectedIncidentId, selectIncident } = useStore()
  const isSelected = selectedIncidentId === incident.id
  const isActive   = incident.status === 'active'

  return (
    <button
      onClick={() => selectIncident(incident.id)}
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
  )
}
