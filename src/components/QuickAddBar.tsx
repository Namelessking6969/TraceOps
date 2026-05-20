import { useState } from 'react'
import { open }                        from '@tauri-apps/plugin-dialog'
import { copyFile, stat, mkdir }       from '@tauri-apps/plugin-fs'
import { appDataDir, join }            from '@tauri-apps/api/path'
import { createEntry }                 from '../db'
import { useStore }                    from '../store'
import type { EntryType }              from '../types'

const PLACEHOLDER: Record<EntryType, string> = {
  note:    'Write a note about what just happened...',
  command: 'Paste or type the command you ran...',
  file:    '',
}

export function QuickAddBar() {
  const { selectedIncidentId, addEntry, showToast } = useStore()
  const [activeType, setActiveType] = useState<EntryType>('note')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!selectedIncidentId || !text.trim()) return
    setLoading(true)
    try {
      const entry = await createEntry(selectedIncidentId, { type: activeType, content: text.trim() })
      addEntry(entry)
      setText('')
    } catch {
      showToast('Failed to save entry — please try again', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileAttach() {
    if (!selectedIncidentId) return
    setLoading(true)
    try {
      const selected = await open({ multiple: false, directory: false })
      if (!selected || typeof selected !== 'string') return

      const filename = selected.split(/[/\\]/).pop() ?? 'file'
      const destDir  = await join(await appDataDir(), 'traceops', 'attachments', selectedIncidentId)
      const destPath = await join(destDir, filename)

      await mkdir(destDir, { recursive: true })
      await copyFile(selected, destPath)

      const info  = await stat(selected)
      const entry = await createEntry(selectedIncidentId, {
        type:      'file',
        content:   filename,
        file_path: destPath,
        file_size: info.size,
      })
      addEntry(entry)
    } catch {
      showToast('Failed to attach file — please try again', 'error')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { type: EntryType; label: string }[] = [
    { type: 'note',    label: '📝 Note' },
    { type: 'command', label: '⌨️ Command' },
    { type: 'file',    label: '📎 File' },
  ]

  return (
    <div className="border-t border-[var(--border)] p-3 flex-shrink-0">
      <div className="bg-[var(--bg-input)] rounded-lg p-2.5">
        <div className="flex gap-1.5 mb-2">
          {tabs.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeType === type
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeType === 'file' ? (
          <button
            onClick={handleFileAttach}
            disabled={loading}
            className="w-full bg-[var(--bg-surface)] rounded px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] text-left transition-colors disabled:opacity-50"
          >
            Click to choose a file...
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--bg-surface)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder={PLACEHOLDER[activeType]}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAdd() }}
              disabled={loading}
            />
            <button
              onClick={handleAdd}
              disabled={loading || !text.trim()}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
