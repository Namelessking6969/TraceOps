import { useEffect } from 'react'
import { Store } from '@tauri-apps/plugin-store'
import { useStore } from '../store'
import type { ThemeKey } from '../themes'

const STORE_KEY = 'theme'

let tauriStore: Store | null = null

async function getStore(): Promise<Store> {
  if (!tauriStore) tauriStore = await Store.load('settings.json')
  return tauriStore
}

export function useTheme() {
  const { theme, setTheme } = useStore()

  useEffect(() => {
    getStore()
      .then((store) => store.get<ThemeKey>(STORE_KEY))
      .then((saved) => {
        if (saved) setTheme(saved)
      })
      .catch(() => {
        // first launch — no saved value, use default
      })
  }, [setTheme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    getStore()
      .then((store) => store.set(STORE_KEY, theme).then(() => store.save()))
      .catch(() => {})
  }, [theme])
}
