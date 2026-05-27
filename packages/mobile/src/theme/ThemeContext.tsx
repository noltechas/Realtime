import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, View } from 'react-native'
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

// Total crossfade duration when the theme changes. Half is spent fading the
// old theme out and half is spent fading the new theme in, with the token
// swap happening at the midpoint so descendants instantly read the new theme
// once they're invisible.
const THEME_FADE_MS = 500

// Shared crossfade wrapper — animates opacity from 1 → 0 → 1 whenever the
// resolved theme name changes, swapping the rendered token bundle at the
// midpoint. The backdrop sits at the *incoming* theme's app background so the
// old content fades out into the new background color instead of flashing
// through whatever the parent View happens to be.
function ThemeCrossfade({
  desiredThemeName,
  children,
  fillParent,
}: {
  desiredThemeName: string
  children: React.ReactNode
  // When true, render flex:1 wrappers with a backdrop matching the incoming
  // theme's appBg — used at the full-screen level so the fade-out reveals the
  // new background color. When false, wrap children in a passthrough
  // Animated.View that preserves their natural sizing — used for inline
  // subtree overrides like queue rows.
  fillParent: boolean
}) {
  const [renderedThemeName, setRenderedThemeName] = useState(desiredThemeName)
  const opacity = useRef(new Animated.Value(1)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (desiredThemeName === renderedThemeName) return
    animationRef.current?.stop()
    const fadeOut = Animated.timing(opacity, {
      toValue: 0,
      duration: THEME_FADE_MS,
      useNativeDriver: true,
    })
    animationRef.current = fadeOut
    fadeOut.start(({ finished }) => {
      if (!finished) return
      setRenderedThemeName(desiredThemeName)
      const fadeIn = Animated.timing(opacity, {
        toValue: 1,
        duration: THEME_FADE_MS,
        useNativeDriver: true,
      })
      animationRef.current = fadeIn
      fadeIn.start()
    })
  }, [desiredThemeName, renderedThemeName, opacity])

  const value = useMemo<ThemeContextValue>(
    () => makeValue(resolveMobileTheme(renderedThemeName), renderedThemeName),
    [renderedThemeName],
  )

  if (fillParent) {
    const backdropColor = resolveMobileTheme(desiredThemeName).appBg
    return (
      <ThemeContext.Provider value={value}>
        <StatusBar style={value.tokens.statusBarStyle} />
        <View style={{ flex: 1, backgroundColor: backdropColor }}>
          <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
        </View>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={{ opacity }}>{children}</Animated.View>
    </ThemeContext.Provider>
  )
}

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

  return (
    <ThemeCrossfade desiredThemeName={themeName} fillParent>
      {children}
    </ThemeCrossfade>
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
  if (!themeName) {
    return (
      <ThemeContext.Provider value={parent ?? makeValue(NEO_BRUTAL_MOBILE, 'neo-brutal')}>
        {children}
      </ThemeContext.Provider>
    )
  }
  return (
    <ThemeCrossfade desiredThemeName={themeName} fillParent={false}>
      {children}
    </ThemeCrossfade>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
