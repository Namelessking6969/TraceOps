# Delete Closed Incidents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to delete closed incidents via a sidebar hover button, right-click context menu, and incident header button — with a confirmation modal and a 5-second undo toast before the DB write.

**Architecture:** In-memory deferred delete — on confirmation the incident is immediately removed from the Zustand store, a 5-second `setTimeout` queues the actual SQLite DELETE, and an undo action cancels the timer and restores the incident to the store. A shared `useDeleteIncident` hook encapsulates this logic so both `IncidentItem` and `IncidentHeader` use identical delete behaviour.

**Tech Stack:** React 19, Zustand 5, Vitest 4, Tailwind CSS 3, Tauri 2 + SQLite (`@tauri-apps/plugin-sql`)

---

### Task 1: Add `deleteIncident` to `db.ts`

**Files:**
- Modify: `src/db.ts`

- [ ] **Step 1: Add the function**

Open `src/db.ts` and add this after `closeIncident`:

```ts
export async function deleteIncident(id: string): Promise<void> {
  await db.execute('DELETE FROM entries WHERE incident_id = ?', [id])
  await db.execute('DELETE FROM incidents WHERE id = ?', [id])
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db.ts
git commit -m "feat: add deleteIncident db function"
```

---

### Task 2: Add `removeIncident` to store + extend Toast interface

**Files:**
- Modify: `src/store.ts`
- Create: `src/__tests__/store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import type { Incident, Entry } from '../types'

const makeIncident = (id: string, status: 'active' | 'closed' = 'closed'): Incident => ({
  id,
  title: `Incident ${id}`,
  status,
  severity: null,
  started_at: Date.now(),
  closed_at: status === 'closed' ? Date.now() : null,
  notes: null,
})

const makeEntry = (id: string, incident_id: string): Entry => ({
  id,
  incident_id,
  type: 'note',
  content: 'x',
  file_path: null,
  file_size: null,
  created_at: Date.now(),
})

beforeEach(() => {
  useStore.setState({ incidents: [], selectedIncidentId: null, entries: [], toast: null })
})

describe('removeIncident', () => {
  it('removes the incident from the list', () => {
    useStore.setState({ incidents: [makeIncident('1'), makeIncident('2')] })
    useStore.getState().removeIncident('1')
    const { incidents } = useStore.getState()
    expect(incidents).toHaveLength(1)
    expect(incidents[0].id).toBe('2')
  })

  it('clears selection and entries when removing the selected incident', () => {
    useStore.setState({
      incidents: [makeIncident('1')],
      selectedIncidentId: '1',
      entries: [makeEntry('e1', '1')],
    })
    useStore.getState().removeIncident('1')
    const state = useStore.getState()
    expect(state.selectedIncidentId).toBeNull()
    expect(state.entries).toHaveLength(0)
  })

  it('does not clear selection when removing a different incident', () => {
    useStore.setState({
      incidents: [makeIncident('1'), makeIncident('2')],
      selectedIncidentId: '1',
    })
    useStore.getState().removeIncident('2')
    expect(useStore.getState().selectedIncidentId).toBe('1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL — `removeIncident is not a function`.

- [ ] **Step 3: Replace `src/store.ts` with updated version**

```ts
import { create } from 'zustand'
import type { Incident, Entry } from './types'

interface Toast {
  id: string
  message: string
  type: 'error' | 'success'
  onUndo?: () => void
  duration?: number
}

interface AppStore {
  incidents: Incident[]
  selectedIncidentId: string | null
  entries: Entry[]
  toast: Toast | null

  setIncidents: (incidents: Incident[]) => void
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  removeIncident: (id: string) => void
  selectIncident: (id: string | null) => void
  setEntries: (entries: Entry[]) => void
  addEntry: (entry: Entry) => void
  showToast: (message: string, type: 'error' | 'success', onUndo?: () => void) => void
  clearToast: () => void
}

export const useStore = create<AppStore>((set) => ({
  incidents:          [],
  selectedIncidentId: null,
  entries:            [],
  toast:              null,

  setIncidents: (incidents) => set({ incidents }),

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  updateIncident: (id, patch) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  removeIncident: (id) =>
    set((s) => ({
      incidents: s.incidents.filter((i) => i.id !== id),
      ...(s.selectedIncidentId === id ? { selectedIncidentId: null, entries: [] } : {}),
    })),

  selectIncident: (id) => set({ selectedIncidentId: id, entries: [] }),

  setEntries: (entries) => set({ entries }),

  addEntry: (entry) =>
    set((s) => ({ entries: [...s.entries, entry] })),

  showToast: (message, type, onUndo) =>
    set({ toast: { id: String(Date.now()), message, type, onUndo, duration: onUndo ? 5000 : 4000 } }),

  clearToast: () => set({ toast: null }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts src/__tests__/store.test.ts
git commit -m "feat: add removeIncident action and extend Toast interface with onUndo/duration"
```

---

### Task 3: Update `Toast.tsx` to support undo button and configurable duration

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: Replace `src/components/Toast.tsx`**

```tsx
import { useEffect } from 'react'
import { useStore } from '../store'

export function Toast() {
  const { toast, clearToast } = useStore()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, toast.duration ?? 4000)
    return () => clearTimeout(t)
  }, [toast?.id, clearToast])

  if (!toast) return null

  const bg   = toast.type === 'error' ? 'bg-red-950 border-red-700'   : 'bg-green-950 border-green-700'
  const text = toast.type === 'error' ? 'text-red-300'                 : 'text-green-300'

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border ${bg} shadow-xl`}>
      <span className={`text-sm ${text}`}>{toast.message}</span>
      {toast.onUndo && (
        <button
          onClick={() => { toast.onUndo!(); clearToast() }}
          className="text-xs font-semibold text-slate-200 hover:text-white underline"
        >
          Undo
        </button>
      )}
      <button onClick={clearToast} className="text-slate-400 hover:text-slate-200 text-lg leading-none">×</button>
    </div>
  )
}
```

Note: the `useEffect` dependency is keyed on `toast?.id` (not the whole `toast` object) so the 5-second timer resets properly for each new toast.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat: add Undo button and configurable duration to Toast"
```

---

### Task 4: Create `DeleteIncidentModal.tsx`

**Files:**
- Create: `src/components/DeleteIncidentModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DeleteIncidentModal.tsx
git commit -m "feat: add DeleteIncidentModal component"
```

---

### Task 5: Create `useDeleteIncident` hook

**Files:**
- Create: `src/hooks/useDeleteIncident.ts`

- [ ] **Step 1: Create the hooks directory**

```bash
mkdir -p src/hooks
```

- [ ] **Step 2: Create `src/hooks/useDeleteIncident.ts`**

```ts
import { useRef } from 'react'
import { useStore } from '../store'
import { deleteIncident } from '../db'
import type { Incident } from '../types'

export function useDeleteIncident() {
  const { removeIncident, addIncident, showToast } = useStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDelete(incident: Incident) {
    removeIncident(incident.id)

    timerRef.current = setTimeout(async () => {
      try {
        await deleteIncident(incident.id)
      } catch {
        showToast('Failed to delete incident — please try again', 'error')
      }
    }, 5000)

    showToast('Incident deleted', 'success', () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      addIncident(incident)
    })
  }

  return { handleDelete }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDeleteIncident.ts
git commit -m "feat: add useDeleteIncident hook with 5-second deferred delete and undo"
```

---

### Task 6: Update `IncidentItem.tsx` — hover trash button + right-click context menu

**Files:**
- Modify: `src/components/IncidentItem.tsx`

- [ ] **Step 1: Replace `src/components/IncidentItem.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useStore }             from '../store'
import { useDeleteIncident }    from '../hooks/useDeleteIncident'
import { DeleteIncidentModal }  from './DeleteIncidentModal'
import type { Incident } from '../types'

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-slate-400', medium: 'bg-yellow-400', high: 'bg-orange-400', critical: 'bg-red-500',
}

export function IncidentItem({ incident }: { incident: Incident }) {
  const { selectedIncidentId, selectIncident } = useStore()
  const { handleDelete } = useDeleteIncident()
  const isSelected = selectedIncidentId === incident.id
  const isActive   = incident.status === 'active'
  const isClosed   = incident.status === 'closed'

  const [showConfirm, setShowConfirm] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent) {
    if (!isClosed) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  function openConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    setContextMenu(null)
    setShowConfirm(true)
  }

  function onConfirmDelete() {
    setShowConfirm(false)
    handleDelete(incident)
  }

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => selectIncident(incident.id)}
          onContextMenu={handleContextMenu}
          className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors border ${
            isSelected
              ? 'bg-blue-950 border-blue-700'
              : 'hover:bg-slate-800 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />}
            <span className={`text-sm font-medium truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
              {incident.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>{isActive ? 'Active' : 'Closed'}</span>
            {incident.severity && (
              <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[incident.severity]}`} />
            )}
          </div>
        </button>

        {isClosed && (
          <button
            onClick={openConfirm}
            title="Delete incident"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
          className="z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[120px]"
        >
          <button
            onClick={openConfirm}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {showConfirm && (
        <DeleteIncidentModal
          incidentTitle={incident.title}
          onClose={() => setShowConfirm(false)}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/IncidentItem.tsx
git commit -m "feat: add hover delete button and right-click context menu to IncidentItem"
```

---

### Task 7: Update `IncidentHeader.tsx` — add delete button for closed incidents

**Files:**
- Modify: `src/components/IncidentHeader.tsx`

- [ ] **Step 1: Replace `src/components/IncidentHeader.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { save }            from '@tauri-apps/plugin-dialog'
import { writeTextFile }   from '@tauri-apps/plugin-fs'
import { useStore }        from '../store'
import { closeIncident }   from '../db'
import { generateMarkdown } from '../export'
import { formatElapsed }   from '../utils/time'
import { CloseIncidentModal }  from './CloseIncidentModal'
import { DeleteIncidentModal } from './DeleteIncidentModal'
import { useDeleteIncident }   from '../hooks/useDeleteIncident'

const SEVERITY_BADGE: Record<string, string> = {
  low:      'bg-slate-700 text-slate-300',
  medium:   'bg-yellow-950 text-yellow-300',
  high:     'bg-orange-950 text-orange-300',
  critical: 'bg-red-950 text-red-300',
}

export function IncidentHeader() {
  const { selectedIncidentId, incidents, entries, updateIncident, showToast } = useStore()
  const { handleDelete } = useDeleteIncident()
  const incident = incidents.find((i) => i.id === selectedIncidentId)

  const [elapsed, setElapsed]       = useState(0)
  const [showClose, setShowClose]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [exporting, setExporting]   = useState(false)

  useEffect(() => {
    if (!incident || incident.status !== 'active') return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - incident.started_at) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [incident?.id, incident?.status, incident?.started_at])

  if (!incident) return null

  async function handleExport() {
    if (!incident) return
    setExporting(true)
    try {
      const md   = generateMarkdown(incident, entries)
      const slug = incident.title.replace(/\s+/g, '-').toLowerCase()
      const path = await save({
        defaultPath: `${slug}-incident.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (path) {
        await writeTextFile(path, md)
        showToast('Report exported', 'success')
      }
    } catch {
      showToast('Export failed — please try again', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleClose(notes: string | null) {
    if (!incident) return
    const closedAt = Date.now()
    try {
      await closeIncident(incident.id, closedAt, notes)
      updateIncident(incident.id, { status: 'closed', closed_at: closedAt, notes })
      setShowClose(false)
    } catch {
      showToast('Failed to close incident', 'error')
    }
  }

  function onConfirmDelete() {
    if (!incident) return
    setShowDelete(false)
    handleDelete(incident)
  }

  return (
    <>
      <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100">{incident.title}</h1>
            {incident.severity && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${SEVERITY_BADGE[incident.severity]}`}>
                {incident.severity}
              </span>
            )}
            {incident.status === 'active' && (
              <span className="bg-slate-800 text-red-400 text-xs px-2 py-0.5 rounded font-mono">
                🔴 {formatElapsed(elapsed)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(incident.started_at).toLocaleString('en-US')}
            {incident.status === 'closed' && incident.closed_at && (
              <> · Closed {new Date(incident.closed_at).toLocaleString('en-US')}</>
            )}
            &nbsp;· {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            Export
          </button>
          {incident.status === 'active' && (
            <button
              onClick={() => setShowClose(true)}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
            >
              Close Incident
            </button>
          )}
          {incident.status === 'closed' && (
            <button
              onClick={() => setShowDelete(true)}
              className="bg-red-900 hover:bg-red-800 border border-red-800 text-red-300 text-xs px-3 py-1.5 rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {showClose && (
        <CloseIncidentModal onClose={() => setShowClose(false)} onConfirm={handleClose} />
      )}
      {showDelete && (
        <DeleteIncidentModal
          incidentTitle={incident.title}
          onClose={() => setShowDelete(false)}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/IncidentHeader.tsx
git commit -m "feat: add delete button to IncidentHeader for closed incidents"
```
