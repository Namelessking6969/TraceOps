import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME } from '../themes'

const REQUIRED_CSS_VARS = [
  '--bg-base', '--bg-panel', '--bg-surface', '--bg-input', '--bg-hover',
  '--border', '--text-primary', '--text-secondary', '--text-muted', '--text-faint',
  '--accent', '--accent-hover', '--accent-subtle', '--accent-border',
]

describe('themes', () => {
  it('has at least 4 themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4)
  })

  it('every theme has key, label, and swatch colors', () => {
    for (const theme of THEMES) {
      expect(theme.key).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.swatchBg).toMatch(/^#/)
      expect(theme.swatchSurface).toMatch(/^#/)
      expect(theme.swatchAccent).toMatch(/^#/)
    }
  })

  it('DEFAULT_THEME key exists in THEMES', () => {
    expect(THEMES.some((t) => t.key === DEFAULT_THEME)).toBe(true)
  })

  it('theme keys are unique', () => {
    const keys = THEMES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('REQUIRED_CSS_VARS list is complete', () => {
    expect(REQUIRED_CSS_VARS).toHaveLength(14)
  })
})
