import { createContext, useContext, useEffect, ReactNode } from 'react'
import type { Theme } from '../styles/theme'
import { NEO } from '../styles/neo-brutal'
import { CYBERPUNK } from '../styles/cyberpunk'
import { SKETCH } from '../styles/sketch'
import { URBAN } from '../styles/urban'
import { useApp } from './AppContext'

const THEMES: Record<string, Theme> = {
  'neo-brutal': NEO,
  'cyberpunk': CYBERPUNK,
  'sketch': SKETCH,
  'urban': URBAN,
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
  const { state, dispatch } = useApp()
  const themeName = state.themeName || 'neo-brutal'
  const theme = THEMES[themeName] ?? NEO

  const setThemeName = (name: string) => {
    dispatch({ type: 'SET_THEME_NAME', payload: name })
  }

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
