# Feedback Tab Design

**Date:** 2026-05-20

## Overview

Add a "Feedback" tab to the existing `SettingsModal` so users can send bug reports and feedback directly to a Discord channel via webhook. No new modals or sidebar buttons — extends the existing tab pattern.

## Architecture

All logic lives in `SettingsModal.tsx`. No new files, no new Rust/Tauri commands. The fetch to the Discord webhook is made directly from the frontend (CSP is `null`).

## UI

- Third tab added: `'appearance' | 'about' | 'feedback'`
- **Name field** — single-line text input, optional, placeholder "Your name (optional)"
- **Message field** — textarea, required, placeholder "Describe the bug or feedback..."
- **Send button** — disabled while sending or when message is empty

## Data Flow

1. User fills in optional name + required message, clicks Send
2. Frontend fetches the Discord webhook URL with a POST containing a Discord embed:
   - **Title:** "TraceOps Feedback"
   - **Fields:** Name (or "Anonymous"), Message, App Version (auto-read via `getVersion()`)
3. On success (HTTP 2xx): show inline "Sent! Thanks for your feedback." confirmation, clear the form
4. On error: show inline "Failed to send — please try again." message, leave form intact

## Discord Webhook Payload

```json
{
  "embeds": [{
    "title": "TraceOps Feedback",
    "color": 5814783,
    "fields": [
      { "name": "From", "value": "<name or Anonymous>", "inline": true },
      { "name": "Version", "value": "v<version>", "inline": true },
      { "name": "Message", "value": "<message>" }
    ]
  }]
}
```

## Error Handling

- Send button is disabled when message is empty or while a send is in flight (prevents double-send)
- Network errors and non-2xx responses both surface the same "Failed to send" message
- No retry logic — user can click Send again manually

## Scope

- No server-side component
- No rate limiting (Discord webhooks have their own limits; acceptable for low-volume feedback)
- Webhook URL hardcoded in `SettingsModal.tsx`
