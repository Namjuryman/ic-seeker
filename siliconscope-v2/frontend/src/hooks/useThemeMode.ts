import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'siliconscope-theme'

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readInitialTheme)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, themeMode)
    applyTheme(themeMode)
  }, [themeMode])

  return { themeMode, setThemeMode }
}
