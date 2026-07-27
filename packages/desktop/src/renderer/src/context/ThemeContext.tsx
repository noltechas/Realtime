import { createContext, useContext, useEffect, ReactNode } from 'react'
import type { Theme } from '../styles/theme'
import { NEO } from '../styles/neo-brutal'
import { CYBERPUNK } from '../styles/cyberpunk'
import { SKETCH } from '../styles/sketch'
import { URBAN } from '../styles/urban'
import { DEEP_SEA } from '../styles/deep-sea'
import { PSYCHEDELIC } from '../styles/psychedelic'
import { ZEN } from '../styles/zen'
import { SPACE } from '../styles/space'
import { STEAMPUNK } from '../styles/steampunk'
import { RETROWAVE } from '../styles/retrowave'
import { COMIC_BOOK } from '../styles/comic-book'
import { TROPICAL } from '../styles/tropical'
import { useApp } from './AppContext'

export const THEMES: Record<string, Theme> = {
  'neo-brutal': NEO,
  'cyberpunk': CYBERPUNK,
  'sketch': SKETCH,
  'urban': URBAN,
  'deep-sea': DEEP_SEA,
  'psychedelic': PSYCHEDELIC,
  'zen': ZEN,
  'space': SPACE,
  'steampunk': STEAMPUNK,
  'retrowave': RETROWAVE,
  'comic-book': COMIC_BOOK,
  'tropical': TROPICAL,
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

  // Inject theme-specific global CSS and set data-theme attribute.
  // STAGE WINDOW ONLY: the main window's host console has a fixed design
  // (styles/admin.css) and must never receive theme CSS — several themes
  // restyle body/button/* via [data-theme] selectors, which would override it.
  useEffect(() => {
    if (!window.electronAPI?.isStageWindow) return
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

export function StageThemeProvider({ themeName, children }: { themeName?: string | null; children: ReactNode }) {
  const parent = useContext(ThemeContext)
  const resolvedName = themeName && THEMES[themeName] ? themeName : undefined
  const override = resolvedName ? THEMES[resolvedName] : undefined

  // The EFFECTIVE stage theme is the per-song override when it's valid,
  // otherwise the global (parent) theme. We always drive the shared
  // document `data-theme` + injected `#theme-global-css` from this effective
  // theme — including when there's no override — so that when a themed song
  // ends the stage restores the global theme instead of leaving the last
  // override's `data-theme`/CSS stuck on the document. The parent
  // ThemeProvider can't clean up after us: its effect only re-fires when the
  // GLOBAL theme.name/globalCss change, which they didn't. Depending on the
  // parent's name/globalCss too means we re-assert the effective theme after
  // any global-theme change while a song is on stage.
  const effective: Theme = override ?? parent

  useEffect(() => {
    // Same stage-window gate as ThemeProvider: never let theme CSS leak into
    // the main window's fixed-design console (its cleanup would re-inject the
    // parent theme's CSS document-wide).
    if (!window.electronAPI?.isStageWindow) return
    const root = document.documentElement
    root.dataset.theme = effective.name

    let style = document.getElementById('theme-global-css') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'theme-global-css'
      document.head.appendChild(style)
    }
    style.textContent = effective.globalCss ?? ''

    return () => {
      // On unmount (leaving the stage) or before re-asserting, fall back to
      // the global theme so a stale override never lingers on the document.
      root.dataset.theme = parent.name
      if (style) style.textContent = parent.globalCss ?? ''
    }
  }, [effective.name, effective.globalCss, parent.name, parent.globalCss])

  if (!override) return <>{children}</>

  const value: ThemeContextValue = {
    ...override,
    setThemeName: parent.setThemeName,
    cycleTheme: parent.cycleTheme,
    themeList: THEME_LIST,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
