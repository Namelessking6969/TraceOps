# Feedback Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Feedback" tab to the Settings modal that lets users send a message (and optional name) to a Discord webhook.

**Architecture:** All changes are confined to `src/components/SettingsModal.tsx`. A new `feedback` tab is added to the existing tab union type. Form state (name, message, send status) is local to the component. On submit, a `fetch` POST is made directly to the Discord webhook with an embed payload that includes the user's name (or "Anonymous"), their message, and the running app version.

**Tech Stack:** React (useState), Tauri `getVersion()` API, Discord webhook (fetch)

---

### Task 1: Add the feedback tab button

**Files:**
- Modify: `src/components/SettingsModal.tsx`

The tab union type is `'appearance' | 'about'` on line 9. The tab list is rendered on lines 47–59. Extend both.

- [ ] **Step 1: Widen the Tab type**

In `SettingsModal.tsx`, change line 9 from:
```ts
type Tab = 'appearance' | 'about'
```
to:
```ts
type Tab = 'appearance' | 'about' | 'feedback'
```

- [ ] **Step 2: Add feedback to the tab render list**

Change line 47 from:
```tsx
{(['appearance', 'about'] as Tab[]).map((tab) => (
```
to:
```tsx
{(['appearance', 'about', 'feedback'] as Tab[]).map((tab) => (
```

- [ ] **Step 3: Verify the tab appears**

Run the dev server:
```bash
npm run dev
```
Open the app, click the gear icon, confirm three tabs appear: Appearance, About, Feedback. Clicking Feedback should render nothing (no panel yet). No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat: add feedback tab button to settings modal"
```

---

### Task 2: Add form state

**Files:**
- Modify: `src/components/SettingsModal.tsx`

- [ ] **Step 1: Add three state variables after the existing `useState` calls (after line 14)**

```tsx
const [name, setName]       = useState('')
const [message, setMessage] = useState('')
const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build
```
Expected: build succeeds with no type errors.

---

### Task 3: Implement the send function

**Files:**
- Modify: `src/components/SettingsModal.tsx`

- [ ] **Step 1: Add the webhook constant at the top of the file, after the `GITHUB_URL` constant (after line 7)**

```ts
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1506729527525638235/4HOsOdLS9wb8IGBrVfUxj3lBTi5HeRqn9w8Iy0a7DIUnvdiCqvBNRP9XqQIXSHMmZXWf'
```

- [ ] **Step 2: Add the `sendFeedback` function inside the component, after the `handleGitHub` function (after line 26)**

```tsx
async function sendFeedback() {
  if (!message.trim() || sendStatus === 'sending') return
  setSendStatus('sending')
  try {
    const res = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'TraceOps Feedback',
          color: 5814783,
          fields: [
            { name: 'From',    value: name.trim() || 'Anonymous', inline: true },
            { name: 'Version', value: `v${version}`,              inline: true },
            { name: 'Message', value: message.trim() },
          ],
        }],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setSendStatus('success')
    setName('')
    setMessage('')
  } catch {
    setSendStatus('error')
  }
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npm run build
```
Expected: build succeeds.

---

### Task 4: Add the Feedback tab panel UI

**Files:**
- Modify: `src/components/SettingsModal.tsx`

Add the feedback panel after the About tab closing brace (after line 123, before the empty `<div>` footer).

- [ ] **Step 1: Add the feedback panel**

```tsx
{/* Feedback Tab */}
{activeTab === 'feedback' && (
  <div className="p-5 flex flex-col gap-3">
    <p className="text-xs text-[var(--text-muted)]">
      Found a bug or have a suggestion? Let us know.
    </p>
    <input
      type="text"
      placeholder="Your name (optional)"
      value={name}
      onChange={(e) => { setName(e.target.value); setSendStatus('idle') }}
      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
    />
    <textarea
      placeholder="Describe the bug or feedback..."
      value={message}
      onChange={(e) => { setMessage(e.target.value); setSendStatus('idle') }}
      rows={4}
      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] resize-none"
    />
    {sendStatus === 'success' && (
      <p className="text-xs text-green-500">Sent! Thanks for your feedback.</p>
    )}
    {sendStatus === 'error' && (
      <p className="text-xs text-red-500">Failed to send — please try again.</p>
    )}
    <button
      onClick={sendFeedback}
      disabled={!message.trim() || sendStatus === 'sending'}
      className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {sendStatus === 'sending' ? 'Sending…' : 'Send Feedback'}
    </button>
  </div>
)}
```

- [ ] **Step 2: Reset sendStatus when switching away from feedback tab**

Update the tab button's `onClick` to reset state when leaving the feedback tab:
```tsx
onClick={() => { setActiveTab(tab); if (tab !== 'feedback') setSendStatus('idle') }}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Manual verification**

Run the dev server:
```bash
npm run dev
```
Check:
- Feedback tab shows the name field, message textarea, and Send button
- Send button is disabled when the message is empty
- Send button is enabled once you type a message
- Submitting sends a message to the Discord channel with correct name, version, and message fields
- Success state: form clears, "Sent!" text appears
- Error state (test by temporarily breaking the URL): "Failed to send" text appears
- Switching tabs resets the status message

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat: add feedback tab with Discord webhook integration"
```
