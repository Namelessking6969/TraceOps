import { useState } from 'react'
import { createIncident } from '../db'
import { useStore }       from '../store'
import type { Severity }  from '../types'

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical']

export function NewIncidentModal({ onClose }: { onClose: () => void }) {
  const { addIncident, selectIncident, showToast } = useStore()
  const [title,    setTitle]    = useState('')
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const incident = await createIncident({ title: title.trim(), severity })
      addIncident(incident)
      selectIncident(incident.id)
      onClose()
    } catch {
      showToast('Failed to create incident', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-slate-100 mb-1">New Incident</h2>
        <p className="text-sm text-slate-500 mb-4">Give this incident a name and optional severity.</p>
        <input
          autoFocus
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 mb-3"
          placeholder="e.g. DB Timeout, WiFi Drop, K8s Pod Crash"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setSeverity(null)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              severity === null ? 'bg-slate-600 text-white border-slate-500' : 'text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
          >
            None
          </button>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1 rounded text-xs border transition-colors capitalize ${
                severity === s ? 'bg-slate-600 text-white border-slate-500' : 'text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Start Incident
          </button>
        </div>
      </div>
    </div>
  )
}
