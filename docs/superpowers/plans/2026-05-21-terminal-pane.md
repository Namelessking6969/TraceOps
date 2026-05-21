# Terminal Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, resizable terminal split pane below the timeline that executes shell commands and saves each run as a `command` entry on the incident.

**Architecture:** `MainArea` grows a vertical split — `Timeline` (flex-1) + drag handle + `TerminalPane` (fixed height, draggable between 120px–500px). A `>_` button in `IncidentHeader` toggles the pane open/closed. `TerminalPane` uses `@tauri-apps/plugin-shell` to spawn `sh -c <cmd>`, streams stdout/stderr live into a history display, and on process exit calls `createEntry` + `addEntry` to log the full run.

**Tech Stack:** React 19, Tauri 2, `@tauri-apps/plugin-shell` (already installed in Cargo.toml and package.json), Zustand, SQLite via `@tauri-apps/plugin-sql`, Tailwind CSS, Vitest + jsdom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/terminal.ts` | Create | Pure formatter: command + output lines → entry content string |
| `src/__tests__/terminal.test.ts` | Create | Unit tests for the formatter |
| `src/components/EntryItem.tsx` | Modify | Add `whitespace-pre-wrap` to command display so multi-line content renders |
| `src/components/IncidentHeader.tsx` | Modify | Accept optional `onToggleTerminal`/`terminalOpen` props; render `>_` button for active incidents |
| `src/components/TerminalPane.tsx` | Create | History display, input row, shell execution, entry saving |
| `src/components/MainArea.tsx` | Modify | Split-pane layout, drag handle, terminal toggle state |

---

## Task 1: Add `formatCommandEntry` utility with tests

**Files:**
- Create: `src/utils/terminal.ts`
- Create: `src/__tests__/terminal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/terminal.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatCommandEntry } from '../utils/terminal'

describe('formatCommandEntry', () => {
  it('formats command with output lines', () => {
    const result = formatCommandEntry('ping 8.8.8.8', ['PING 8.8.8.8', '64 bytes from 8.8.8.8'])
    expect(result).toBe('$ ping 8.8.8.8\n\nPING 8.8.8.8\n64 bytes from 8.8.8.8')
  })

  it('formats command with no output', () => {
    const result = formatCommandEntry('clear', [])
    expect(result).toBe('$ clear')
  })

  it('formats command with single output line', () => {
    const result = formatCommandEntry('echo hello', ['hello'])
    expect(result).toBe('$ echo hello\n\nhello')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- terminal
```

Expected: FAIL with `Cannot find module '../utils/terminal'`

- [ ] **Step 3: Create the utility**

Create `src/utils/terminal.ts`:

```typescript
export function formatCommandEntry(cmd: string, lines: string[]): string {
  const output = lines.join('\n')
  return output ? `$ ${cmd}\n\n${output}` : `$ ${cmd}`
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- terminal
```

Expected: 3 tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add src/utils/terminal.ts src/__tests__/terminal.test.ts
git commit -m "feat: add formatCommandEntry utility"
```

---

## Task 2: Update `EntryItem` for multi-line command content

**Files:**
- Modify: `src/components/EntryItem.tsx` (command block, around line 31)

- [ ] **Step 1: Add `whitespace-pre-wrap` to the command content div**

In `src/components/EntryItem.tsx`, find the command block:

```tsx
// Before
{entry.type === 'command' && (
  <div className="bg-[var(--bg-input)] rounded px-2 py-1.5 font-mono text-xs text-emerald-300 break-all">
    {entry.content}
  </div>
)}
```

Replace with:

```tsx
// After
{entry.type === 'command' && (
  <div className="bg-[var(--bg-input)] rounded px-2 py-1.5 font-mono text-xs text-emerald-300 whitespace-pre-wrap break-words">
    {entry.content}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EntryItem.tsx
git commit -m "feat: render multi-line command entries in timeline"
```

---

## Task 3: Add terminal toggle props to `IncidentHeader`

**Files:**
- Modify: `src/components/IncidentHeader.tsx` (lines 19 and ~101)

- [ ] **Step 1: Add the props interface and update the function signature**

In `src/components/IncidentHeader.tsx`, replace line 19:

```tsx
// Before
export function IncidentHeader() {
```

```tsx
// After
interface Props {
  onToggleTerminal?: () => void
  terminalOpen?: boolean
}

export function IncidentHeader({ onToggleTerminal, terminalOpen }: Props) {
```

- [ ] **Step 2: Add the `>_` button as the first child of the button group**

Find `<div className="flex gap-2">` (around line 101) and add the button as the first child:

```tsx
<div className="flex gap-2">
  {incident.status === 'active' && onToggleTerminal && (
    <button
      onClick={onToggleTerminal}
      className={`bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border text-xs px-3 py-1.5 rounded transition-colors font-mono ${
        terminalOpen
          ? 'border-emerald-700 text-emerald-400'
          : 'border-[var(--border)] text-[var(--text-secondary)]'
      }`}
    >
      &gt;_
    </button>
  )}
  <button
    onClick={handleExport}
    disabled={exporting}
    className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
  >
    Export
  </button>
  {/* ...rest of buttons unchanged... */}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/IncidentHeader.tsx
git commit -m "feat: add terminal toggle button to incident header"
```

---

## Task 4: Create `TerminalPane` component

**Files:**
- Create: `src/components/TerminalPane.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/TerminalPane.tsx`:

```tsx
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [runs])

  function appendLine(line: string) {
    setRuns(prev => {
      const copy = [...prev]
      const last = { ...copy[copy.length - 1] }
      last.lines = [...last.lines, line]
      copy[copy.length - 1] = last
      return copy
    })
  }

  function markLastDone() {
    setRuns(prev => {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TerminalPane.tsx
git commit -m "feat: add TerminalPane with shell execution and live output"
```

---

## Task 5: Wire split-pane layout in `MainArea`

**Files:**
- Modify: `src/components/MainArea.tsx`

- [ ] **Step 1: Replace the full contents of `MainArea.tsx`**

```tsx
import { useState } from 'react'
import { useStore }       from '../store'
import { IncidentHeader } from './IncidentHeader'
import { Timeline }       from './Timeline'
import { QuickAddBar }    from './QuickAddBar'
import { TerminalPane }   from './TerminalPane'

export function MainArea() {
  const { selectedIncidentId, incidents } = useStore()
  const incident = incidents.find((i) => i.id === selectedIncidentId)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [paneHeight, setPaneHeight] = useState(220)

  const isActive = incident?.status === 'active'
  const showTerminal = terminalOpen && isActive

  function handleDragMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = paneHeight

    function onMouseMove(ev: MouseEvent) {
      const delta = startY - ev.clientY
      setPaneHeight(Math.max(120, Math.min(500, startHeight + delta)))
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  if (!selectedIncidentId) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--text-faint)]">
          <p className="text-lg mb-1">No incident selected</p>
          <p className="text-sm">Create a new incident or select one from the sidebar</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <IncidentHeader
        onToggleTerminal={isActive ? () => setTerminalOpen(o => !o) : undefined}
        terminalOpen={terminalOpen}
      />
      <Timeline />
      {showTerminal && (
        <>
          <div
            className="h-1.5 bg-[var(--border)] hover:bg-[var(--accent)] cursor-row-resize flex-shrink-0 transition-colors"
            onMouseDown={handleDragMouseDown}
          />
          <div
            style={{ height: paneHeight }}
            className="flex-shrink-0 overflow-hidden border-t border-[var(--border)]"
          >
            <TerminalPane />
          </div>
        </>
      )}
      {isActive && <QuickAddBar />}
    </main>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broken**

```bash
npm test
```

Expected: all pre-existing tests pass (store, themes, time, export, generate-update-manifest, terminal)

- [ ] **Step 3: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "feat: wire terminal split pane into main area layout"
```

---

## Manual Verification Checklist

After all tasks complete, run the app with `npm run tauri dev` and verify:

- [ ] `>_` button appears in header for active incidents only
- [ ] Clicking `>_` opens the terminal pane below the timeline; clicking again closes it
- [ ] The button turns green/emerald when the terminal is open
- [ ] Drag handle between timeline and terminal pane resizes the pane
- [ ] Typing a command and pressing Enter executes it via `sh -c`
- [ ] Output streams live into the terminal history
- [ ] On completion, the entry appears in the timeline above (command + output, multi-line)
- [ ] The terminal pane is not visible for closed incidents
- [ ] Running a failing command (e.g., `false`) still saves an entry
- [ ] Running a command that doesn't exist shows a toast error
