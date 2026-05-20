import { useState, useEffect } from 'react'
import { getVersion }  from '@tauri-apps/api/app'
import { open }        from '@tauri-apps/plugin-shell'
import { useStore }    from '../store'
import { THEMES }      from '../themes'

const GITHUB_URL = 'https://github.com/Namelessking6969/TraceOps'
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1506729527525638235/4HOsOdLS9wb8IGBrVfUxj3lBTi5HeRqn9w8Iy0a7DIUnvdiCqvBNRP9XqQIXSHMmZXWf'

type Tab = 'appearance' | 'about' | 'feedback'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('appearance')
  const [version, setVersion] = useState<string>('...')
  const [name, setName]             = useState('')
  const [message, setMessage]       = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('—'))
  }, [])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleGitHub() {
    await open(GITHUB_URL).catch(console.error)
  }

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
          {(['appearance', 'about', 'feedback'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab !== 'feedback') setSendStatus('idle') }}
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

        <div className="px-5 pb-5" />
      </div>
    </div>
  )
}
