interface Props {
  incidentTitle: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteIncidentModal({ incidentTitle, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-slate-100 mb-1">Delete Incident</h2>
        <p className="text-sm text-slate-400 mb-1">
          <span className="text-slate-200 font-medium">{incidentTitle}</span>
        </p>
        <p className="text-sm text-slate-500 mb-6">
          This will permanently delete this incident and all its entries. You'll have 5 seconds to undo.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded transition-colors"
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
