import { describe, it, expect } from 'vitest'
import { formatTimestamp, formatElapsed, formatDuration } from '../utils/time'

describe('formatTimestamp', () => {
  it('returns a string matching HH:MM AM/PM', () => {
    const ts = new Date('2026-05-18T09:14:00').getTime()
    expect(formatTimestamp(ts)).toMatch(/^\d{2}:\d{2} (AM|PM)$/)
  })
})

describe('formatElapsed', () => {
  it('formats under 60 seconds as 00:SS', () => {
    expect(formatElapsed(45)).toBe('00:45')
  })
  it('formats minutes as MM:SS', () => {
    expect(formatElapsed(125)).toBe('02:05')
  })
  it('formats hours as HH:MM:SS', () => {
    expect(formatElapsed(3661)).toBe('01:01:01')
  })
})

describe('formatDuration', () => {
  it('returns Xm for sub-hour durations', () => {
    const start = new Date('2026-05-18T09:14:00').getTime()
    const end   = new Date('2026-05-18T09:31:00').getTime()
    expect(formatDuration(start, end)).toBe('17m')
  })
  it('returns Xh Ym for multi-hour durations', () => {
    const start = new Date('2026-05-18T09:00:00').getTime()
    const end   = new Date('2026-05-18T10:30:00').getTime()
    expect(formatDuration(start, end)).toBe('1h 30m')
  })
})
