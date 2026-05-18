import { useState } from 'react'

interface Props {
  onClose: () => void
  onConfirm: (notes: string | null) => void
}

export function CloseIncidentModal({ onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-slate-100 mb-1">Close Incident</h2>
        <p className="text-sm text-slate-500 mb-4">Add optional closing notes before marking as resolved.</p>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          rows={4}
          placeholder="Root cause, remediation steps, or anything worth noting..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes.trim() || null)}
            className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            Close Incident
          </button>
        </div>
      </div>
    </div>
  )
}
