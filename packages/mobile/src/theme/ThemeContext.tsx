import React, { createContext, useContext, useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import type { ThemeTokens } from '@karaoke/shared'
import { resolveMobileTheme, NEO_BRUTAL_MOBILE } from './tokens'
import { mobileStyles, type MobileStyles } from './styles'
import { useSession } from '../hooks/useSession'
import { useSessionRow } from '../hooks/useSessionRow'

interface ThemeContextValue {
  tokens: ThemeTokens
  styles: MobileStyles
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Internal — builds the context value from a token bundle. Memoized so screens
// re-render only when the underlying theme name changes.
function makeValue(tokens: ThemeTokens): ThemeContextValue {
  return { tokens, styles: mobileStyles(tokens) }
}

// Root provider. Doesn't subscribe to the session — at the root level we don't
// know which session the user is in (Home screen / pre-join). The session row
// hook only fires once the user is inside a session, so we wrap that behavior
// in a separate SessionThemeProvider used inside SessionTabs.
//
// Defaults to neo-brutal until a session-aware provider down the tree replaces
// it. This means the Home / Lobby / scan flow render with neo-brutal — that's
// the intended pre-session look, matching the website's behavior where the
// theme only kicks in after `theme_name` is read from the session row.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextValue>(() => makeValue(NEO_BRUTAL_MOBILE), [])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Session-aware provider — reads the live session row's theme_name and any
// override from now_playing_stage_theme, then re-renders descendants with the
// resolved token bundle. Mirrors the website's
//   activeTheme = S.nowPlayingStageTheme || S.theme_name
// from docs/js/themes.js so the mobile UI flips themes in lock-step with the
// stage when a song with a custom stage theme starts.
export function SessionThemeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const themeName = row?.now_playing_stage_theme || row?.theme_name || 'neo-brutal'
  const value = useMemo<ThemeContextValue>(
    () => makeValue(resolveMobileTheme(themeName)),
    [themeName],
  )
  return (
    <ThemeContext.Provider value={value}>
      {/* Override the root StatusBar so dark themes get light glyphs. The
          last-mounted StatusBar wins, so this stays in effect for the whole
          session. */}
      <StatusBar style={value.tokens.statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  )
}

// Per-subtree theme override — wraps children with a different token bundle
// than their parent. Used by the queue list to render each card under the
// per-song `stage_theme` while keeping the rest of the screen on the active
// session theme. `name` here is the session row's `theme_name` / per-song
// `stage_theme` string — null/undefined falls back to the inherited context.
export function LocalThemeProvider({
  themeName,
  children,
}: {
  themeName: string | null | undefined
  children: React.ReactNode
}) {
  const parent = useContext(ThemeContext)
  const value = useMemo<ThemeContextValue>(() => {
    if (!themeName) return parent ?? makeValue(NEO_BRUTAL_MOBILE)
    return makeValue(resolveMobileTheme(themeName))
  }, [themeName, parent])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
