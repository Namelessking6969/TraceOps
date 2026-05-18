export type EntryType = 'note' | 'command' | 'file'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'active' | 'closed'

export interface Incident {
  id: string
  title: string
  status: IncidentStatus
  severity: Severity | null
  started_at: number   // unix ms
  closed_at: number | null
  notes: string | null // closing notes
}

export interface Entry {
  id: string
  incident_id: string
  type: EntryType
  content: string        // note text, command string, or filename
  file_path: string | null  // absolute path in app data dir; null for note/command
  file_size: number | null  // bytes; null for note/command
  created_at: number     // unix ms, set at insert, never edited
}

export interface NewIncidentForm {
  title: string
  severity: Severity | null
}

export interface NewEntryForm {
  type: EntryType
  content: string
  file_path?: string
  file_size?: number
}
