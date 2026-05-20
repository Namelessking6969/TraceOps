import { useStore } from '../store'
import { EntryItem } from './EntryItem'

export function Timeline() {
  const entries = useStore((s) => s.entries)

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-faint)] text-sm">
        No entries yet — add a note, command, or file below
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {entries.map((e) => <EntryItem key={e.id} entry={e} />)}
    </div>
  )
}
