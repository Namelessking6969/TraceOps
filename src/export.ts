import type { Incident, Entry } from './types'
import { formatTimestamp, formatDuration } from './utils/time'

export function generateMarkdown(incident: Incident, entries: Entry[]): string {
  const severity = incident.severity?.toUpperCase() ?? 'UNSET'
  const started  = new Date(incident.started_at).toLocaleString('en-US')
  const closed   = incident.closed_at ? new Date(incident.closed_at).toLocaleString('en-US') : 'Ongoing'
  const duration = incident.closed_at ? formatDuration(incident.started_at, incident.closed_at) : 'Ongoing'

  const timelineLines = entries.map((e) => {
    const ts    = formatTimestamp(e.created_at)
    const label = e.type === 'command' ? 'CMD' : e.type === 'file' ? 'FILE' : 'NOTE'
    const body  = e.type === 'file' && e.file_size != null
      ? `${e.content} (${Math.round(e.file_size / 1024)} KB)`
      : e.content
    return `${ts}  [${label}]  ${body}`
  })

  const lines = [
    `# Incident: ${incident.title}`,
    '',
    `**Started:** ${started}  |  **Closed:** ${closed}  |  **Duration:** ${duration}`,
    `**Severity:** ${severity}`,
    '',
    '## Timeline',
    '',
    ...timelineLines,
  ]

  if (incident.notes) {
    lines.push('', '## Closing Notes', '', incident.notes)
  }

  return lines.join('\n')
}
