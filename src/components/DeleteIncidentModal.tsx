interface Props {
  incidentTitle: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteIncidentModal({ incidentTitle, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">Delete Incident</h2>
        <p className="text-sm text-[var(--text-muted)] mb-1">
          <span className="text-[var(--text-primary)] font-medium">{incidentTitle}</span>
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          This will permanently delete this incident and all its entries. You'll have 5 seconds to undo.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-sm px-4 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
