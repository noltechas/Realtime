import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { StatusBar } from 'expo-status-bar'
import type { ThemeTokens } from '@karaoke/shared'
import { resolveMobileTheme, NEO_BRUTAL_MOBILE } from './tokens'
import { resolveThemeUI } from './registry'
import type { ThemeUIModule } from './types'
import { useSession } from '../hooks/useSession'
import { useSessionRow } from '../hooks/useSessionRow'

interface ThemeContextValue {
  tokens: ThemeTokens
  ui: ThemeUIModule
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Module-level cache — survives re-mounts within the same JS runtime. Set by
// SessionThemeProvider once the real session row arrives, so any subsequent
// SessionThemeProvider mount (e.g. the Wizard modal) starts on the correct
// theme immediately instead of flashing neo-brutal.
let _lastKnownSessionTheme: string | null = null

function makeValue(tokens: ThemeTokens, name: string): ThemeContextValue {
  return { tokens, ui: resolveThemeUI(name) }
}

// Root provider — defaults to neo-brutal until a session-aware provider down
// the tree replaces it. Pre-session screens (Home / Lobby / scan) render with
// neo-brutal, mirroring the website's behavior.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextValue>(
    () => makeValue(NEO_BRUTAL_MOBILE, 'neo-brutal'),
    [],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Session-aware provider — reads the live session row's theme_name and the
// per-song override (now_playing_stage_theme), then re-renders descendants
// with the resolved tokens + ThemeUIModule.
export function SessionThemeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const themeName = row?.now_playing_stage_theme || row?.theme_name || _lastKnownSessionTheme || 'neo-brutal'

  useEffect(() => {
    if (row) _lastKnownSessionTheme = themeName
  }, [row, themeName])

  const value = useMemo<ThemeContextValue>(
    () => makeValue(resolveMobileTheme(themeName), themeName),
    [themeName],
  )
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={value.tokens.statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  )
}

// Per-subtree theme override — wraps children with a different token bundle
// than their parent. Used by the queue list to render each card under the
// per-song stage_theme while keeping the rest of the screen on the active
// session theme.
export function LocalThemeProvider({
  themeName,
  children,
}: {
  themeName: string | null | undefined
  children: React.ReactNode
}) {
  const parent = useContext(ThemeContext)
  const value = useMemo<ThemeContextValue>(() => {
    if (!themeName) return parent ?? makeValue(NEO_BRUTAL_MOBILE, 'neo-brutal')
    return makeValue(resolveMobileTheme(themeName), themeName)
  }, [themeName, parent])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
