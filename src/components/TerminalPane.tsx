import { useEffect, useRef, useState } from 'react'
import { Command } from '@tauri-apps/plugin-shell'
import { createEntry } from '../db'
import { useStore } from '../store'
import { formatCommandEntry } from '../utils/terminal'

interface Run {
  cmd: string
  lines: string[]
  done: boolean
}

export function TerminalPane() {
  const { selectedIncidentId, addEntry, showToast } = useStore()
  const [runs, setRuns] = useState<Run[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [runs])

  useEffect(() => {
    setRuns([])
  }, [selectedIncidentId])

  function appendLine(line: string) {
    setRuns(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const last = { ...copy[copy.length - 1] }
      last.lines = [...last.lines, line]
      copy[copy.length - 1] = last
      return copy
    })
  }

  function markLastDone() {
    setRuns(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      copy[copy.length - 1] = { ...copy[copy.length - 1], done: true }
      return copy
    })
  }

  async function handleSubmit() {
    const cmd = input.trim()
    if (!cmd || running || !selectedIncidentId) return

    setInput('')
    setRunning(true)
    setRuns(prev => [...prev, { cmd, lines: [], done: false }])

    const collectedLines: string[] = []

    try {
      const command = Command.create('sh', ['-c', cmd])

      command.stdout.on('data', (line: string) => {
        collectedLines.push(line)
        appendLine(line)
      })
      command.stderr.on('data', (line: string) => {
        collectedLines.push(line)
        appendLine(line)
      })

      await new Promise<void>((resolve, reject) => {
        command.on('close', () => resolve())
        command.on('error', (err: string) => reject(new Error(err)))
        command.spawn().catch(reject)
      })

      markLastDone()

      const entry = await createEntry(selectedIncidentId, {
        type: 'command',
        content: formatCommandEntry(cmd, collectedLines),
      })
      addEntry(entry)
    } catch {
      showToast('Failed to run command', 'error')
      markLastDone()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-input)] font-mono text-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {runs.length === 0 && (
          <p className="text-[var(--text-muted)] text-xs">
            Commands run here are saved to the incident timeline.
          </p>
        )}
        {runs.map((run, i) => (
          <div key={i}>
            <div className="text-emerald-400">$ {run.cmd}</div>
            {run.lines.map((line, j) => (
              <div key={j} className="text-[var(--text-secondary)] whitespace-pre-wrap">{line}</div>
            ))}
            {!run.done && (
              <div className="text-[var(--text-muted)] animate-pulse text-xs">running...</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-[var(--border)] px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-emerald-400 select-none">$</span>
        <input
          className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder-[var(--text-muted)]"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          disabled={running}
          placeholder={running ? 'Running...' : 'Enter a command...'}
          autoFocus
        />
      </div>
    </div>
  )
}
