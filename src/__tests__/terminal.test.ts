import { describe, it, expect } from 'vitest'
import { formatCommandEntry } from '../utils/terminal'

describe('formatCommandEntry', () => {
  it('formats command with output lines', () => {
    const result = formatCommandEntry('ping 8.8.8.8', ['PING 8.8.8.8', '64 bytes from 8.8.8.8'])
    expect(result).toBe('$ ping 8.8.8.8\n\nPING 8.8.8.8\n64 bytes from 8.8.8.8')
  })

  it('formats command with no output', () => {
    const result = formatCommandEntry('clear', [])
    expect(result).toBe('$ clear')
  })

  it('formats command with single output line', () => {
    const result = formatCommandEntry('echo hello', ['hello'])
    expect(result).toBe('$ echo hello\n\nhello')
  })
})
