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
