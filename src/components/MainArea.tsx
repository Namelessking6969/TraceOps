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
