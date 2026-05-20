import { useState } from 'react'

interface Props {
  onClose: () => void
  onConfirm: (notes: string | null) => void
}

export function CloseIncidentModal({ onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Close Incident</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Add optional closing notes before marking as resolved.</p>
        <textarea
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          rows={4}
          placeholder="Root cause, remediation steps, or anything worth noting..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-sm px-4 py-2 rounded transition-colors"
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
