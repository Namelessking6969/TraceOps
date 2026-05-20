export type ThemeKey = 'dark-slate' | 'dracula' | 'light-default' | 'solarized-light'

export interface ThemeMeta {
  key: ThemeKey
  label: string
  swatchBg: string
  swatchSurface: string
  swatchAccent: string
}

export const DEFAULT_THEME: ThemeKey = 'dark-slate'

export const THEMES: ThemeMeta[] = [
  {
    key:          'dark-slate',
    label:        'Dark Slate',
    swatchBg:     '#020617',
    swatchSurface:'#1e293b',
    swatchAccent: '#2563eb',
  },
  {
    key:          'dracula',
    label:        'Dracula',
    swatchBg:     '#21222c',
    swatchSurface:'#44475a',
    swatchAccent: '#bd93f9',
  },
  {
    key:          'light-default',
    label:        'Light',
    swatchBg:     '#f1f5f9',
    swatchSurface:'#ffffff',
    swatchAccent: '#2563eb',
  },
  {
    key:          'solarized-light',
    label:        'Solarized',
    swatchBg:     '#eee8d5',
    swatchSurface:'#fdf6e3',
    swatchAccent: '#268bd2',
  },
]
