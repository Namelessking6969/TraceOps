# TraceOps

A desktop incident timeline logger built with Tauri 2, React, and TypeScript.

TraceOps gives IT and ops teams a fast, local-first tool to document incidents as they happen. Open an incident, log timestamped notes, commands, and file attachments in real time, then close it with a summary when the dust settles. Every incident exports to a clean Markdown report.

## Features

- Create incidents with a title and severity (low / medium / high / critical)
- Log timestamped timeline entries as notes, commands, or file attachments
- Close incidents with closing notes and an auto-calculated duration
- Export any incident to a Markdown report
- All data stored locally via SQLite — no accounts, no cloud

## Stack

- [Tauri 2](https://tauri.app) — native desktop shell (Rust)
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) — UI
- [Zustand](https://github.com/pmndrs/zustand) — state management
- [SQLite](https://www.sqlite.org) via `tauri-plugin-sql` — local persistence
- [Tailwind CSS](https://tailwindcss.com) — styling

## Dev Setup

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Release

```bash
./scripts/bump-version.sh          # patch bump (default)
./scripts/bump-version.sh minor
./scripts/bump-version.sh major
```

Prompts for changelog bullets, updates all version files, commits, tags, and pushes.
