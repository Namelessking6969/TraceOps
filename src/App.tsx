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
