import Database from '@tauri-apps/plugin-sql'
import { v4 as uuidv4 } from 'uuid'
import type { Incident, Entry, NewIncidentForm, NewEntryForm } from './types'

let db: Database

export async function initDb(): Promise<void> {
  db = await Database.load('sqlite:traceops.db')
  await db.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL,
      severity   TEXT,
      started_at INTEGER NOT NULL,
      closed_at  INTEGER,
      notes      TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id          TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      type        TEXT NOT NULL,
      content     TEXT NOT NULL,
      file_path   TEXT,
      file_size   INTEGER,
      created_at  INTEGER NOT NULL
    )
  `)
}

export async function getAllIncidents(): Promise<Incident[]> {
  return db.select<Incident[]>(
    'SELECT * FROM incidents ORDER BY started_at DESC'
  )
}

export async function createIncident(form: NewIncidentForm): Promise<Incident> {
  const incident: Incident = {
    id:         uuidv4(),
    title:      form.title,
    status:     'active',
    severity:   form.severity,
    started_at: Date.now(),
    closed_at:  null,
    notes:      null,
  }
  await db.execute(
    'INSERT INTO incidents (id, title, status, severity, started_at, closed_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [incident.id, incident.title, incident.status, incident.severity, incident.started_at, incident.closed_at, incident.notes]
  )
  return incident
}

export async function closeIncident(id: string, closedAt: number, notes: string | null): Promise<void> {
  await db.execute(
    'UPDATE incidents SET status = ?, closed_at = ?, notes = ? WHERE id = ?',
    ['closed', closedAt, notes, id]
  )
}

export async function getEntriesForIncident(incidentId: string): Promise<Entry[]> {
  return db.select<Entry[]>(
    'SELECT * FROM entries WHERE incident_id = ? ORDER BY created_at ASC',
    [incidentId]
  )
}

export async function createEntry(incidentId: string, form: NewEntryForm): Promise<Entry> {
  const entry: Entry = {
    id:          uuidv4(),
    incident_id: incidentId,
    type:        form.type,
    content:     form.content,
    file_path:   form.file_path ?? null,
    file_size:   form.file_size ?? null,
    created_at:  Date.now(),
  }
  await db.execute(
    'INSERT INTO entries (id, incident_id, type, content, file_path, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [entry.id, entry.incident_id, entry.type, entry.content, entry.file_path, entry.file_size, entry.created_at]
  )
  return entry
}
