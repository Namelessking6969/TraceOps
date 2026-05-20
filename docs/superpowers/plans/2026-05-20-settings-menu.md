# Settings Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings modal (gear icon in sidebar) with theme switching (4 themes via CSS custom properties) and an About tab showing version + GitHub link.

**Architecture:** CSS custom properties on `<html data-theme="…">` drive all color tokens; Zustand holds the active theme key; a `useTheme` hook syncs Zustand → DOM and reads/writes the Tauri store plugin for persistence across restarts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3, Zustand v5, Tauri v2, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-shell`, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/themes.ts` | Create | Theme metadata: keys, labels, swatch colors |
| `src/hooks/useTheme.ts` | Create | DOM sync + Tauri store read/write |
| `src/components/SettingsModal.tsx` | Create | Modal with Appearance + About tabs |
| `src/index.css` | Modify | CSS variable blocks for all 4 themes; body uses vars |
| `index.html` | Modify | Add `data-theme="dark-slate"` default to `<html>` |
| `src/store.ts` | Modify | Add `theme` field + `setTheme` action |
| `src/App.tsx` | Modify | Call `useTheme()` hook |
| `src/components/Sidebar.tsx` | Modify | Gear icon footer + SettingsModal render; color refactor |
| `src/components/MainArea.tsx` | Modify | Color refactor |
| `src/components/IncidentHeader.tsx` | Modify | Color refactor |
| `src/components/IncidentItem.tsx` | Modify | Color refactor |
| `src/components/EntryItem.tsx` | Modify | Color refactor |
| `src/components/Timeline.tsx` | Modify | Color refactor |
| `src/components/QuickAddBar.tsx` | Modify | Color refactor |
| `src/components/NewIncidentModal.tsx` | Modify | Color refactor |
| `src/components/CloseIncidentModal.tsx` | Modify | Color refactor |
| `src/components/DeleteIncidentModal.tsx` | Modify | Color refactor |
| `src/components/Toast.tsx` | Modify | Color refactor |
| `src/__tests__/store.test.ts` | Modify | Tests for `setTheme` |
| `src/__tests__/themes.test.ts` | Create | Tests that all themes define required CSS var keys |
| `src-tauri/src/lib.rs` | Modify | Register store + shell plugins |
| `src-tauri/Cargo.toml` | Modify | Add `tauri-plugin-store` + `tauri-plugin-shell` |
| `src-tauri/capabilities/default.json` | Modify | Add store + shell permissions |

---

## Task 1: Install and register Tauri plugins

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Install npm packages**

Run from the project root:
```bash
npm install @tauri-apps/plugin-store @tauri-apps/plugin-shell
```

Expected: packages added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Add Cargo dependencies**

In `src-tauri/Cargo.toml`, add two lines inside `[dependencies]`:

```toml
tauri-plugin-store = "2"
tauri-plugin-shell = "2"
```

Full `[dependencies]` block after edit:
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-updater = "2"
tauri-plugin-store = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 3: Register plugins in lib.rs**

Replace the contents of `src-tauri/src/lib.rs` with:

```rust
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(updater) = handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update.download_and_install(|_, _| {}, || {}).await;
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Add capabilities**

In `src-tauri/capabilities/default.json`, add store and shell permissions:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-copy-file",
    "fs:allow-read-file",
    "fs:allow-write-text-file",
    "fs:allow-stat",
    "fs:allow-mkdir",
    "updater:default",
    "store:allow-load",
    "store:allow-get",
    "store:allow-set",
    "store:allow-save",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 5: Verify Cargo compiles**

Run from the project root:
```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: ends with something like `Finished dev [unoptimized + debuginfo]` and no errors. If `tauri-plugin-store` or `tauri-plugin-shell` fail to resolve, run `cargo update` first.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "chore: install and register tauri-plugin-store and tauri-plugin-shell"
```

---

## Task 2: CSS variable blocks in index.css + default theme in index.html

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Replace src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── dark-slate (default) ──────────────────────────────────── */
[data-theme="dark-slate"] {
  --bg-base:        #0f172a;
  --bg-panel:       #020617;
  --bg-surface:     #0f172a;
  --bg-input:       #1e293b;
  --bg-hover:       #334155;
  --border:         #1e293b;
  --text-primary:   #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted:     #94a3b8;
  --text-faint:     #475569;
  --accent:         #2563eb;
  --accent-hover:   #3b82f6;
  --accent-subtle:  #172554;
  --accent-border:  #1d4ed8;
}

/* ── dracula ───────────────────────────────────────────────── */
[data-theme="dracula"] {
  --bg-base:        #282a36;
  --bg-panel:       #21222c;
  --bg-surface:     #2d2f3f;
  --bg-input:       #44475a;
  --bg-hover:       #4e5066;
  --border:         #44475a;
  --text-primary:   #f8f8f2;
  --text-secondary: #cac9d8;
  --text-muted:     #6272a4;
  --text-faint:     #4c5680;
  --accent:         #bd93f9;
  --accent-hover:   #d0b0ff;
  --accent-subtle:  #3a2d5a;
  --accent-border:  #7c5cbf;
}

/* ── light-default ─────────────────────────────────────────── */
[data-theme="light-default"] {
  --bg-base:        #f8fafc;
  --bg-panel:       #f1f5f9;
  --bg-surface:     #ffffff;
  --bg-input:       #f1f5f9;
  --bg-hover:       #e2e8f0;
  --border:         #cbd5e1;
  --text-primary:   #0f172a;
  --text-secondary: #334155;
  --text-muted:     #64748b;
  --text-faint:     #94a3b8;
  --accent:         #2563eb;
  --accent-hover:   #1d4ed8;
  --accent-subtle:  #eff6ff;
  --accent-border:  #93c5fd;
}

/* ── solarized-light ───────────────────────────────────────── */
[data-theme="solarized-light"] {
  --bg-base:        #fdf6e3;
  --bg-panel:       #eee8d5;
  --bg-surface:     #fdf6e3;
  --bg-input:       #eee8d5;
  --bg-hover:       #ddd5bb;
  --border:         #d0cbb5;
  --text-primary:   #073642;
  --text-secondary: #586e75;
  --text-muted:     #657b83;
  --text-faint:     #93a1a1;
  --accent:         #268bd2;
  --accent-hover:   #1f72af;
  --accent-subtle:  #d6eaf8;
  --accent-border:  #7bbbd9;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

#root {
  height: 100vh;
  display: flex;
}
```

- [ ] **Step 2: Add default data-theme to index.html**

In `index.html`, change:
```html
<html lang="en">
```
to:
```html
<html lang="en" data-theme="dark-slate">
```

This prevents a flash of unstyled content before `useTheme` loads the saved preference.

- [ ] **Step 3: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: add CSS variable theme blocks for 4 themes"
```

---

## Task 3: Create src/themes.ts + test

**Files:**
- Create: `src/themes.ts`
- Create: `src/__tests__/themes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/themes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME } from '../themes'

const REQUIRED_CSS_VARS = [
  '--bg-base', '--bg-panel', '--bg-surface', '--bg-input', '--bg-hover',
  '--border', '--text-primary', '--text-secondary', '--text-muted', '--text-faint',
  '--accent', '--accent-hover', '--accent-subtle', '--accent-border',
]

describe('themes', () => {
  it('has at least 4 themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4)
  })

  it('every theme has key, label, and swatch colors', () => {
    for (const theme of THEMES) {
      expect(theme.key).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.swatchBg).toMatch(/^#/)
      expect(theme.swatchSurface).toMatch(/^#/)
      expect(theme.swatchAccent).toMatch(/^#/)
    }
  })

  it('DEFAULT_THEME key exists in THEMES', () => {
    expect(THEMES.some((t) => t.key === DEFAULT_THEME)).toBe(true)
  })

  it('theme keys are unique', () => {
    const keys = THEMES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('REQUIRED_CSS_VARS list is complete', () => {
    expect(REQUIRED_CSS_VARS).toHaveLength(14)
  })
})
```

- [ ] **Step 2: Run the test — expect it to fail**

```bash
npm test -- themes
```

Expected: FAIL with "Cannot find module '../themes'"

- [ ] **Step 3: Create src/themes.ts**

```typescript
export type ThemeKey = 'dark-slate' | 'dracula' | 'light-default' | 'solarized-light'

export interface ThemeMeta {
  key: ThemeKey
  label: string
  swatchBg: string
  swatchSurface: string
  swatchAccent: string
}

export const DEFAULT_THEME: ThemeKey = 'dark-slate'

export const THEMES: ThemeMeta[] = [
  {
    key:          'dark-slate',
    label:        'Dark Slate',
    swatchBg:     '#020617',
    swatchSurface:'#1e293b',
    swatchAccent: '#2563eb',
  },
  {
    key:          'dracula',
    label:        'Dracula',
    swatchBg:     '#21222c',
    swatchSurface:'#44475a',
    swatchAccent: '#bd93f9',
  },
  {
    key:          'light-default',
    label:        'Light',
    swatchBg:     '#f1f5f9',
    swatchSurface:'#ffffff',
    swatchAccent: '#2563eb',
  },
  {
    key:          'solarized-light',
    label:        'Solarized',
    swatchBg:     '#eee8d5',
    swatchSurface:'#fdf6e3',
    swatchAccent: '#268bd2',
  },
]
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- themes
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/themes.ts src/__tests__/themes.test.ts
git commit -m "feat: add theme definitions and types"
```

---

## Task 4: Add theme to Zustand store + tests

**Files:**
- Modify: `src/store.ts`
- Modify: `src/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/__tests__/store.test.ts` (keep all existing tests intact):

```typescript
describe('theme', () => {
  it('defaults to dark-slate', () => {
    useStore.setState({ incidents: [], selectedIncidentId: null, entries: [], toast: null })
    expect(useStore.getState().theme).toBe('dark-slate')
  })

  it('setTheme updates the theme', () => {
    useStore.getState().setTheme('dracula')
    expect(useStore.getState().theme).toBe('dracula')
  })

  it('setTheme accepts all valid theme keys', () => {
    const keys = ['dark-slate', 'dracula', 'light-default', 'solarized-light'] as const
    for (const key of keys) {
      useStore.getState().setTheme(key)
      expect(useStore.getState().theme).toBe(key)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- store
```

Expected: FAIL — "theme" is not defined on the store state.

- [ ] **Step 3: Update src/store.ts**

```typescript
import { create } from 'zustand'
import type { Incident, Entry } from './types'
import type { ThemeKey } from './themes'
import { DEFAULT_THEME } from './themes'

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
  theme: ThemeKey

  setIncidents: (incidents: Incident[]) => void
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  removeIncident: (id: string) => void
  selectIncident: (id: string | null) => void
  setEntries: (entries: Entry[]) => void
  addEntry: (entry: Entry) => void
  showToast: (message: string, type: 'error' | 'success', onUndo?: () => void) => void
  clearToast: () => void
  setTheme: (theme: ThemeKey) => void
}

export const useStore = create<AppStore>((set) => ({
  incidents:            [],
  selectedIncidentId:   null,
  entries:              [],
  toast:                null,
  theme:                DEFAULT_THEME,

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

  setTheme: (theme) => set({ theme }),
}))
```

- [ ] **Step 4: Run all tests — expect pass**

```bash
npm test
```

Expected: all tests PASS including the 3 new theme tests.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts src/__tests__/store.test.ts
git commit -m "feat: add theme field and setTheme action to store"
```

---

## Task 5: Create useTheme hook

**Files:**
- Create: `src/hooks/useTheme.ts`

No unit test for this hook — it depends on the Tauri store API (not mockable without significant setup). Manual verification happens in Task 10.

- [ ] **Step 1: Create src/hooks/useTheme.ts**

```typescript
import { useEffect } from 'react'
import { Store } from '@tauri-apps/plugin-store'
import { useStore } from '../store'
import { DEFAULT_THEME } from '../themes'
import type { ThemeKey } from '../themes'

const STORE_KEY = 'theme'

let tauriStore: Store | null = null

function getStore(): Store {
  if (!tauriStore) tauriStore = new Store('settings.json')
  return tauriStore
}

export function useTheme() {
  const { theme, setTheme } = useStore()

  useEffect(() => {
    getStore()
      .get<ThemeKey>(STORE_KEY)
      .then((saved) => {
        if (saved) setTheme(saved)
      })
      .catch(() => {
        // first launch — no saved value, use default
      })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    getStore()
      .set(STORE_KEY, theme)
      .then(() => getStore().save())
      .catch(() => {})
  }, [theme])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "feat: add useTheme hook for DOM sync and persistence"
```

---

## Task 6: Wire useTheme into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx**

```typescript
import { useEffect }                         from 'react'
import { initDb, getAllIncidents, getEntriesForIncident } from './db'
import { useStore }                          from './store'
import { Sidebar }                           from './components/Sidebar'
import { MainArea }                          from './components/MainArea'
import { Toast }                             from './components/Toast'
import { useTheme }                          from './hooks/useTheme'

export default function App() {
  const { setIncidents, selectedIncidentId, setEntries, showToast } = useStore()
  useTheme()

  useEffect(() => {
    initDb()
      .then(() => getAllIncidents())
      .then(setIncidents)
      .catch(() => showToast('Failed to initialize database', 'error'))
  }, [])

  useEffect(() => {
    if (!selectedIncidentId) return
    getEntriesForIncident(selectedIncidentId)
      .then(setEntries)
      .catch(() => showToast('Failed to load entries', 'error'))
  }, [selectedIncidentId])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MainArea />
      <Toast />
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire useTheme into App"
```

---

## Task 7: Refactor all component colors to CSS variables

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/MainArea.tsx`
- Modify: `src/components/IncidentHeader.tsx`
- Modify: `src/components/IncidentItem.tsx`
- Modify: `src/components/EntryItem.tsx`
- Modify: `src/components/Timeline.tsx`
- Modify: `src/components/QuickAddBar.tsx`
- Modify: `src/components/NewIncidentModal.tsx`
- Modify: `src/components/CloseIncidentModal.tsx`
- Modify: `src/components/DeleteIncidentModal.tsx`
- Modify: `src/components/Toast.tsx`

**Note:** Severity badge colors (`bg-red-950`, `bg-yellow-950`, etc.) and entry type colors (`bg-blue-500`, `bg-emerald-500`, etc.) are semantic and must NOT be changed to CSS vars.

- [ ] **Step 1: Replace src/components/Sidebar.tsx (color refactor only — gear icon added in Task 9)**

```typescript
import { useState } from 'react'
import { useStore }          from '../store'
import { IncidentItem }      from './IncidentItem'
import { NewIncidentModal }  from './NewIncidentModal'

export function Sidebar() {
  const incidents   = useStore((s) => s.incidents)
  const [showModal, setShowModal] = useState(false)

  const active = incidents.filter((i) => i.status === 'active')
  const closed = incidents.filter((i) => i.status === 'closed')

  return (
    <>
      <aside className="w-52 bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            + New Incident
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {active.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1">Active</p>
              {active.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {closed.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1 mt-2">Closed</p>
              {closed.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {incidents.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] text-center mt-8 px-2">
              No incidents yet. Create one to start logging.
            </p>
          )}
        </div>
      </aside>
      {showModal && <NewIncidentModal onClose={() => setShowModal(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Replace src/components/MainArea.tsx**

```typescript
import { useStore }        from '../store'
import { IncidentHeader }  from './IncidentHeader'
import { Timeline }        from './Timeline'
import { QuickAddBar }     from './QuickAddBar'

export function MainArea() {
  const { selectedIncidentId, incidents } = useStore()
  const incident = incidents.find((i) => i.id === selectedIncidentId)

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
      <IncidentHeader />
      <Timeline />
      {incident?.status === 'active' && <QuickAddBar />}
    </main>
  )
}
```

- [ ] **Step 3: Replace src/components/IncidentHeader.tsx**

```typescript
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
      <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[var(--text-primary)]">{incident.title}</h1>
            {incident.severity && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${SEVERITY_BADGE[incident.severity]}`}>
                {incident.severity}
              </span>
            )}
            {incident.status === 'active' && (
              <span className="bg-[var(--bg-input)] text-red-400 text-xs px-2 py-0.5 rounded font-mono">
                🔴 {formatElapsed(elapsed)}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
            className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50"
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

- [ ] **Step 4: Replace src/components/IncidentItem.tsx**

```typescript
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

  useEffect(() => {
    if (!contextMenu || !contextRef.current) return
    const rect = contextRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const clampedX = Math.min(contextMenu.x, vw - rect.width - 8)
    const clampedY = Math.min(contextMenu.y, vh - rect.height - 8)
    if (clampedX !== contextMenu.x || clampedY !== contextMenu.y) {
      setContextMenu({ x: clampedX, y: clampedY })
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
              ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)]'
              : 'hover:bg-[var(--bg-hover)] border-transparent'
          }`}
        >
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />}
            <span className={`text-sm font-medium truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {incident.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
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
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity p-1"
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
          className="z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-[120px]"
        >
          <button
            onClick={openConfirm}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[var(--bg-hover)] transition-colors"
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

- [ ] **Step 5: Replace src/components/EntryItem.tsx**

```typescript
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
          <span className="text-xs text-[var(--text-muted)]">{formatTimestamp(entry.created_at)}</span>
        </div>

        {entry.type === 'command' && (
          <div className="bg-[var(--bg-input)] rounded px-2 py-1.5 font-mono text-xs text-emerald-300 break-all">
            {entry.content}
          </div>
        )}

        {entry.type === 'file' && (
          <div className="bg-[var(--bg-input)] rounded px-2 py-1.5 flex items-center gap-2">
            <span>📎</span>
            <span className="text-sm text-[var(--text-primary)] truncate">{entry.content}</span>
            {entry.file_size != null && (
              <span className="text-xs text-[var(--text-muted)] ml-auto flex-shrink-0">
                {Math.round(entry.file_size / 1024)} KB
              </span>
            )}
          </div>
        )}

        {entry.type === 'note' && (
          <p className="text-sm text-[var(--text-primary)]">{entry.content}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace src/components/Timeline.tsx**

```typescript
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
```

- [ ] **Step 7: Replace src/components/QuickAddBar.tsx**

```typescript
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
```

- [ ] **Step 8: Replace src/components/NewIncidentModal.tsx**

```typescript
import { useState } from 'react'
import { createIncident } from '../db'
import { useStore }       from '../store'
import type { Severity }  from '../types'

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical']

export function NewIncidentModal({ onClose }: { onClose: () => void }) {
  const { addIncident, selectIncident, showToast } = useStore()
  const [title,    setTitle]    = useState('')
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const incident = await createIncident({ title: title.trim(), severity })
      addIncident(incident)
      selectIncident(incident.id)
      onClose()
    } catch {
      showToast('Failed to create incident', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">New Incident</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Give this incident a name and optional severity.</p>
        <input
          autoFocus
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--accent)] mb-3"
          placeholder="e.g. DB Timeout, WiFi Drop, K8s Pod Crash"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setSeverity(null)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              severity === null
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--text-muted)]'
                : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]'
            }`}
          >
            None
          </button>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1 rounded text-xs border transition-colors capitalize ${
                severity === s
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--text-muted)]'
                  : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-sm px-4 py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Start Incident
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Replace src/components/CloseIncidentModal.tsx**

```typescript
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
```

- [ ] **Step 10: Replace src/components/DeleteIncidentModal.tsx**

```typescript
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
```

- [ ] **Step 11: Replace src/components/Toast.tsx**

```typescript
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
          className="text-xs font-semibold text-[var(--text-primary)] hover:text-white underline"
        >
          Undo
        </button>
      )}
      <button onClick={clearToast} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none">×</button>
    </div>
  )
}
```

- [ ] **Step 12: Run all tests**

```bash
npm test
```

Expected: all tests PASS. TypeScript errors would come from `npm run build`, not vitest.

- [ ] **Step 13: Commit**

```bash
git add src/components/
git commit -m "refactor: replace hard-coded slate colors with CSS variable tokens"
```

**Note on Sidebar in Task 7:** Step 1 (Sidebar) includes only the color refactor — no `SettingsModal` import yet. The gear icon and modal wiring are added in Task 9 after `SettingsModal` exists.

---

## Task 8: Create SettingsModal component

**Files:**
- Create: `src/components/SettingsModal.tsx`

- [ ] **Step 1: Create src/components/SettingsModal.tsx**

```typescript
import { useState, useEffect } from 'react'
import { getVersion }  from '@tauri-apps/api/app'
import { open }        from '@tauri-apps/plugin-shell'
import { useStore }    from '../store'
import { THEMES }      from '../themes'

const GITHUB_URL = 'https://github.com/Namelessking6969/TraceOps'

type Tab = 'appearance' | 'about'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('appearance')
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('—'))
  }, [])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleGitHub() {
    await open(GITHUB_URL)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={handleBackdrop}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 border-b border-[var(--border)]">
          {(['appearance', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm rounded-t capitalize transition-colors ${
                activeTab === tab
                  ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent)] -mb-px'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="p-5">
            <p className="text-xs text-[var(--text-muted)] mb-3">Select a theme</p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => {
                const isActive = theme === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`relative p-3 rounded-lg border text-left transition-colors ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--bg-input)]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M8.5 2.5l-5 5L1 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    <div className="flex gap-1.5 mb-2">
                      <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: t.swatchBg }} />
                      <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: t.swatchSurface }} />
                      <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: t.swatchAccent }} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
              <svg className="w-7 h-7 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">TraceOps</p>
              <p className="text-sm text-[var(--text-muted)]">v{version}</p>
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              Incident timeline logger for IT operations teams.
            </p>
            <button
              onClick={handleGitHub}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              View on GitHub
            </button>
          </div>
        )}

        <div className="px-5 pb-5" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `@tauri-apps/api/app` can't be found, verify `@tauri-apps/api` is in `package.json` (it already is at `^2`).

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat: add SettingsModal with Appearance and About tabs"
```

---

## Task 9: Wire gear icon and SettingsModal into Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

Do this task after Task 8 so `SettingsModal` exists before importing it.

- [ ] **Step 1: Replace src/components/Sidebar.tsx (adds gear icon + SettingsModal)**

```typescript
import { useState } from 'react'
import { useStore }          from '../store'
import { IncidentItem }      from './IncidentItem'
import { NewIncidentModal }  from './NewIncidentModal'
import { SettingsModal }     from './SettingsModal'

export function Sidebar() {
  const incidents   = useStore((s) => s.incidents)
  const [showModal, setShowModal]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const active = incidents.filter((i) => i.status === 'active')
  const closed = incidents.filter((i) => i.status === 'closed')

  return (
    <>
      <aside className="w-52 bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            + New Incident
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {active.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1">Active</p>
              {active.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {closed.length > 0 && (
            <>
              <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider px-2 py-1 mt-2">Closed</p>
              {closed.map((i) => <IncidentItem key={i.id} incident={i} />)}
            </>
          )}
          {incidents.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] text-center mt-8 px-2">
              No incidents yet. Create one to start logging.
            </p>
          )}
        </div>
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-full flex items-center justify-center py-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </aside>
      {showModal    && <NewIncidentModal onClose={() => setShowModal(false)} />}
      {showSettings && <SettingsModal   onClose={() => setShowSettings(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add gear icon and settings modal to sidebar"
```

---

## Task 10: Smoke test + final commit

- [ ] **Step 1: Run all tests one more time**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Run the dev build to check for TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Launch the app and verify**

```bash
npm run tauri dev
```

Manual checks:
- [ ] App opens with dark-slate theme (default look unchanged)
- [ ] Gear icon visible at the bottom of the sidebar
- [ ] Clicking gear opens Settings modal
- [ ] Appearance tab shows 4 theme cards with color swatches
- [ ] Clicking "Dracula" switches theme immediately (purple accent, dark purple bg)
- [ ] Clicking "Light" switches to light theme
- [ ] Clicking "Solarized" switches to warm beige theme
- [ ] Switching back to "Dark Slate" restores original look
- [ ] Closing and reopening the app restores the last selected theme (Tauri store persistence)
- [ ] About tab shows "TraceOps", correct version (0.1.4), and "View on GitHub" button
- [ ] Clicking "View on GitHub" opens `https://github.com/Namelessking6969/TraceOps` in the browser
- [ ] Backdrop click closes the modal
- [ ] × button closes the modal

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: settings menu with 4 themes and About tab"
```
