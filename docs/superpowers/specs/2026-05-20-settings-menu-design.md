# Settings Menu Design

**Date:** 2026-05-20
**Status:** Approved

## Overview

Add a settings menu to TraceOps with theme switching and an About tab. Accessed via a gear icon in the sidebar footer. Theme selection persists across app restarts via Tauri's store plugin.

## Theme System

### Approach: CSS Custom Properties on `<html>`

Each theme is a CSS variable block scoped to `[data-theme="<name>"]` on the `<html>` element. Switching themes sets `document.documentElement.dataset.theme`. No runtime overhead; instant switch.

### CSS Variable Set

```css
--bg-base        /* main window background */
--bg-surface     /* sidebar / panel background */
--bg-elevated    /* modals, dropdowns */
--bg-hover       /* row hover state */
--border         /* dividers and outlines */
--text-primary   /* body text */
--text-muted     /* labels, placeholders, timestamps */
--accent         /* buttons, active states */
--accent-hover   /* button hover */
```

### Themes at Launch (4 total)

| Key | Type | Description |
|-----|------|-------------|
| `dark-slate` | dark | Current look — slate-950 bg, blue accent. Default. |
| `dracula` | dark | #282a36 bg, pink/purple accent |
| `light-default` | light | White/gray bg, dark text, blue accent |
| `solarized-light` | light | Warm #fdf6e3 bg, muted teal accent |

### Component Refactor

All existing hard-coded Tailwind palette classes (`bg-slate-950`, `text-slate-400`, `border-slate-800`, `bg-blue-600`, etc.) across every component are replaced with `bg-[var(--bg-base)]`, `text-[var(--text-primary)]` etc. This is mechanical and touches every component file.

## State & Persistence

### Zustand Store

`store.ts` gains:
- `theme: string` — default `'dark-slate'`
- `setTheme: (theme: string) => void`

### useTheme Hook (`src/hooks/useTheme.ts`)

Called once in `App.tsx`. Responsibilities:
1. On mount: read saved theme from Tauri store (`settings.json`), hydrate Zustand store, apply `data-theme` to `document.documentElement`
2. On store `theme` change: write new value to Tauri store, update `data-theme`

### Tauri Plugins Required

**Store plugin** (theme persistence):
- npm package: `@tauri-apps/plugin-store`
- Cargo dependency: `tauri-plugin-store`
- Registered in `src-tauri/src/lib.rs` via `.plugin(tauri_plugin_store::Builder::default().build())`
- Persists to `settings.json` in the app's data directory

**Shell plugin** (GitHub link):
- npm package: `@tauri-apps/plugin-shell`
- Cargo dependency: `tauri-plugin-shell`
- Registered in `src-tauri/src/lib.rs` via `.plugin(tauri_plugin_shell::init())`
- Used for `open("https://github.com/Namelessking6969/TraceOps")` in the About tab

## Settings Modal UI

### Entry Point

A `⚙` gear icon button pinned to the bottom of the sidebar (`Sidebar.tsx`), below the incident list. Styled consistently with the rest of the sidebar. Clicking opens `SettingsModal`.

### Modal Structure

Centered overlay modal with a backdrop. Closes on backdrop click or the `×` button in the top-right corner.

Two tabs: **Appearance** and **About**.

### Appearance Tab

A 2×2 grid of theme cards. Each card:
- Theme name as label
- Small color swatch strip: 3 colored circles showing bg, surface, and accent colors
- Checkmark ring indicator when the theme is active
- Clicking applies the theme immediately (no save button — persisted on change)

### About Tab

Stacked layout, vertically centered:
- App name "TraceOps" in large text
- Version string `v{version}` — read at runtime via `getVersion()` from `@tauri-apps/api/app` so it stays in sync with `tauri.conf.json` automatically
- Clickable GitHub link: `https://github.com/Namelessking6969/TraceOps` — opens in system browser via `open()` from `@tauri-apps/plugin-shell`

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/SettingsModal.tsx` | Modal with Appearance and About tabs |
| `src/hooks/useTheme.ts` | DOM sync + Tauri store read/write |
| `src/themes.ts` | Theme definitions: keys, display names, CSS var values, swatch colors |

### Modified Files

| File | Change |
|------|--------|
| `src/index.css` | Add `[data-theme="…"]` CSS variable blocks for all 4 themes |
| `src/store.ts` | Add `theme` field and `setTheme` action |
| `src/App.tsx` | Call `useTheme()` hook |
| `src/components/Sidebar.tsx` | Add gear icon button at bottom, render `SettingsModal` |
| `src/components/MainArea.tsx` | Refactor hard-coded Tailwind colors to CSS vars |
| `src/components/IncidentHeader.tsx` | Refactor colors |
| `src/components/IncidentItem.tsx` | Refactor colors |
| `src/components/EntryItem.tsx` | Refactor colors |
| `src/components/Timeline.tsx` | Refactor colors |
| `src/components/QuickAddBar.tsx` | Refactor colors |
| `src/components/NewIncidentModal.tsx` | Refactor colors |
| `src/components/CloseIncidentModal.tsx` | Refactor colors |
| `src/components/DeleteIncidentModal.tsx` | Refactor colors |
| `src/components/Toast.tsx` | Refactor colors |
| `src-tauri/src/lib.rs` | Register `tauri-plugin-store` and `tauri-plugin-shell` |
| `src-tauri/Cargo.toml` | Add `tauri-plugin-store` and `tauri-plugin-shell` dependencies |
| `package.json` | Add `@tauri-apps/plugin-store` and `@tauri-apps/plugin-shell` |
| `src-tauri/capabilities/default.json` | Add shell:open and store permissions |

## Out of Scope

- Custom user-defined themes
- Font size / density settings
- Any other settings beyond theme and about info
