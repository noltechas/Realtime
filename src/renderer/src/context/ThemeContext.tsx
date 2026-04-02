import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Theme } from '../styles/theme'
import { NEO } from '../styles/neo-brutal'
import { CYBERPUNK } from '../styles/cyberpunk'

const THEMES: Record<string, Theme> = {
  'neo-brutal': NEO,
  'cyberpunk': CYBERPUNK,
}

export const THEME_LIST = Object.entries(THEMES).map(([key, t]) => ({
  key,
  displayName: t.displayName ?? key,
}))

interface ThemeContextValue extends Theme {
  setThemeName: (name: string) => void
  cycleTheme: () => void
  themeList: typeof THEME_LIST
}

const ThemeContext = createContext<ThemeContextValue>({
  ...NEO,
  setThemeName: () => {},
  cycleTheme: () => {},
  themeList: THEME_LIST,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<string>('neo-brutal')
  const theme = THEMES[themeName] ?? NEO

  const cycleTheme = () => {
    setThemeName(theme.nextThemeName)
  }

  // Inject theme-specific global CSS and set data-theme attribute
  useEffect(() => {
    document.documentElement.dataset.theme = theme.name

    let style = document.getElementById('theme-global-css') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'theme-global-css'
      document.head.appendChild(style)
    }
    style.textContent = theme.globalCss ?? ''

    return () => {
      if (style) style.textContent = ''
    }
  }, [theme.name, theme.globalCss])

  const value: ThemeContextValue = {
    ...theme,
    setThemeName,
    cycleTheme,
    themeList: THEME_LIST,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
