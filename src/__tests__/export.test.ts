import { describe, it, expect } from 'vitest'
import { generateMarkdown } from '../export'
import type { Incident, Entry } from '../types'

const incident: Incident = {
  id: '1',
  title: 'DB Timeout',
  status: 'closed',
  severity: 'critical',
  started_at: new Date('2026-05-18T09:14:00').getTime(),
  closed_at:  new Date('2026-05-18T09:31:00').getTime(),
  notes: 'Root cause: unstable wireless on AP-03',
}

const entries: Entry[] = [
  { id: 'e1', incident_id: '1', type: 'note',    content: 'Alert received: PostgreSQL timeout spikes', file_path: null, file_size: null, created_at: new Date('2026-05-18T09:14:00').getTime() },
  { id: 'e2', incident_id: '1', type: 'command', content: 'Test-NetConnection db-prod-01 -Port 5432',   file_path: null, file_size: null, created_at: new Date('2026-05-18T09:16:00').getTime() },
  { id: 'e3', incident_id: '1', type: 'file',    content: 'wireshark-capture.pcap', file_path: '/appdata/...', file_size: 2457600, created_at: new Date('2026-05-18T09:18:00').getTime() },
]

describe('generateMarkdown', () => {
  it('includes the incident title', () => {
    expect(generateMarkdown(incident, entries)).toContain('# Incident: DB Timeout')
  })
  it('includes severity in uppercase', () => {
    expect(generateMarkdown(incident, entries)).toContain('CRITICAL')
  })
  it('labels each entry type correctly', () => {
    const md = generateMarkdown(incident, entries)
    expect(md).toContain('[NOTE]')
    expect(md).toContain('[CMD]')
    expect(md).toContain('[FILE]')
  })
  it('includes closing notes when present', () => {
    const md = generateMarkdown(incident, entries)
    expect(md).toContain('## Closing Notes')
    expect(md).toContain('Root cause: unstable wireless on AP-03')
  })
  it('omits closing notes section when null', () => {
    expect(generateMarkdown({ ...incident, notes: null }, entries)).not.toContain('## Closing Notes')
  })
  it('appends file size in KB for file entries', () => {
    expect(generateMarkdown(incident, entries)).toContain('2400 KB')
  })
})
