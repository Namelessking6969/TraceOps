# Terminal Pane Design

**Date:** 2026-05-21  
**Status:** Approved

## Overview

Add a persistent terminal split pane to the incident main area. Users open it with a `>_` button, type shell commands, see live output, and each completed command run is automatically saved to the incident timeline as a `command` entry (command + output).

## Layout

`MainArea` splits vertically:

```
┌──────────────────────────────┐
│  IncidentHeader (+ >_ btn)   │
├──────────────────────────────┤
│                              │
│  Timeline (flex-1, scroll)   │
│                              │
├──── drag handle ─────────────┤
│                              │
│  TerminalPane (default 220px)│
│  [min 120px, max 60% height] │
│                              │
└──────────────────────────────┘
```

- The drag handle sits between `Timeline` and `TerminalPane`; dragging resizes the pane within its min/max bounds.
- Height is component state only — not persisted between sessions.
- The terminal pane only renders when the incident is `active`.
- The `>_` toggle button in `IncidentHeader` shows/hides the pane.

## TerminalPane Component

Two zones:

**History area** (flex-1, scrollable):
- Renders past command runs as discrete blocks
- Each block: `$ <cmd>` in green monospace, followed by output in gray/white monospace
- Output streams in line-by-line as the process emits it
- Auto-scrolls to bottom on new output
- Multiple runs accumulate in the pane (session-only, not persisted)

**Input row** (pinned to bottom):
- `$` prompt label + text input
- Enter submits; input is disabled while a command is running
- Cleared after submission

## Command Execution

- Uses `Command.create('sh', ['-c', userInput])` from `@tauri-apps/plugin-shell`
- Spawns the process and attaches `stdout` and `stderr` event listeners to stream output live
- On process exit (any exit code), saves the completed entry to the DB

## Entry Format

Saved as `type: 'command'` with content:

```
$ <user command>

<stdout + stderr output>
```

Both stdout and stderr are interleaved in arrival order. If the command produces no output, the content is just `$ <cmd>`.

## Timeline Display

`EntryItem` for `command` type gains `whitespace-pre-wrap` so multi-line content (command + output) renders correctly. No other changes to `EntryItem`.

## Error Handling

- Non-zero exit codes: still save the entry with whatever output was captured
- Spawn failure (e.g., `sh` not found): show a toast error, do not create an entry
- Empty input: no-op (do not submit)

## Files Changed

| File | Change |
|------|--------|
| `src/components/MainArea.tsx` | Add split-pane layout, drag handle, terminal toggle state |
| `src/components/TerminalPane.tsx` | New component — history + input |
| `src/components/IncidentHeader.tsx` | Add `>_` toggle button |
| `src/components/EntryItem.tsx` | Add `whitespace-pre-wrap` to command content display |
