import type { Theme } from './types'

export const themeLocalStorageKey = 'payload-theme'

export const defaultTheme = 'dark'

// Only an *explicit* OS light setting is honored — the analog darkroom is the
// effective default; OS darkness is the same experience this theme already is.
export const getImplicitPreference = (): Theme | null => {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : null
  } catch {
    return null
  }
}
