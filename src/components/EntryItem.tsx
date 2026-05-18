import type { Entry } from '../types'
import { formatTimestamp } from '../utils/time'

const BORDER: Record<string, string> = {
  note:    'bg-blue-500',
  command: 'bg-emerald-500',
  file:    'bg-amber-500',
}
const BADGE: Record<string, string> = {
  note:    'bg-blue-950 text-blue-300',
  command: 'bg-emerald-950 text-emerald-300',
  file:    'bg-amber-950 text-amber-300',
}
const LABEL: Record<string, string> = {
  note: 'NOTE', command: 'CMD', file: 'FILE',
}

export function EntryItem({ entry }: { entry: Entry }) {
  return (
    <div className="flex gap-3 mb-3 items-start">
      <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${BORDER[entry.type]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${BADGE[entry.type]}`}>
            {LABEL[entry.type]}
          </span>
          <span className="text-xs text-slate-500">{formatTimestamp(entry.created_at)}</span>
        </div>

        {entry.type === 'command' && (
          <div className="bg-slate-800 rounded px-2 py-1.5 font-mono text-xs text-emerald-300 break-all">
            {entry.content}
          </div>
        )}

        {entry.type === 'file' && (
          <div className="bg-slate-800 rounded px-2 py-1.5 flex items-center gap-2">
            <span>📎</span>
            <span className="text-sm text-slate-200 truncate">{entry.content}</span>
            {entry.file_size != null && (
              <span className="text-xs text-slate-500 ml-auto flex-shrink-0">
                {Math.round(entry.file_size / 1024)} KB
              </span>
            )}
          </div>
        )}

        {entry.type === 'note' && (
          <p className="text-sm text-slate-200">{entry.content}</p>
        )}
      </div>
    </div>
  )
}
