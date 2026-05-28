import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native'
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

// Crossfade timing. The old content fades out quickly so we don't sit on a
// flat backdrop, then the new content fades up over the rest of the second.
// While that's happening, the backdrop color animates continuously from the
// old theme's appBg to the new one — that's what prevents a hard "fade to
// black" through whatever the new theme's flat background would have been.
const FADE_OUT_MS = 220
const FADE_IN_MS = 780
const TOTAL_FADE_MS = FADE_OUT_MS + FADE_IN_MS

// Shared crossfade wrapper for the session-level and per-subtree theme
// providers. On theme change it runs three animations in parallel:
//   • content opacity 1 → 0 (fast fade-out of the old theme's render)
//   • content opacity 0 → 1 (slower fade-in of the new theme's render)
//   • backdrop color old.appBg → new.appBg (smooth tint shift across the full
//     duration, so the brief moment where content is invisible blends between
//     the two themes' backgrounds instead of snapping to either one)
//
// We intentionally swap the rendered token bundle at the midpoint (when
// opacity hits 0) so descendants never see a half-themed render — they only
// see "old theme, fully styled" or "new theme, fully styled." This preserves
// descendant state (the tree is continuously mounted) and avoids the heavy
// double-render that a snapshot-style crossfade would require.
function ThemeCrossfade({
  desiredThemeName,
  children,
  fillParent,
}: {
  desiredThemeName: string
  children: React.ReactNode
  // When true, render flex:1 wrappers with an animated backdrop — used at the
  // full-screen level. When false, wrap children in a passthrough
  // Animated.View that preserves their natural sizing — used for inline
  // subtree overrides like queue rows.
  fillParent: boolean
}) {
  const [renderedThemeName, setRenderedThemeName] = useState(desiredThemeName)
  // Tracks the appBg we're animating *from*. Set at the start of each
  // transition so the backdrop interpolation has the right "from" color even
  // if the theme changes multiple times in quick succession.
  const [fromAppBg, setFromAppBg] = useState(
    () => resolveMobileTheme(desiredThemeName).appBg,
  )
  const opacity = useRef(new Animated.Value(1)).current
  const bgProgress = useRef(new Animated.Value(1)).current
  const fadeOutRef = useRef<Animated.CompositeAnimation | null>(null)
  const fadeInRef = useRef<Animated.CompositeAnimation | null>(null)
  const bgRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (desiredThemeName === renderedThemeName) return

    // Cancel any in-flight transition so a rapid second theme change picks
    // up from wherever the screen currently is instead of fighting itself.
    fadeOutRef.current?.stop()
    fadeInRef.current?.stop()
    bgRef.current?.stop()

    // Capture the current appBg as the interpolation starting point. Reset
    // bgProgress to 0 so the new transition animates from this color → the
    // new theme's appBg.
    setFromAppBg(resolveMobileTheme(renderedThemeName).appBg)
    bgProgress.setValue(0)

    // Backdrop color interpolation runs across the full duration. Can't use
    // the native driver because backgroundColor isn't native-drivable.
    const bg = Animated.timing(bgProgress, {
      toValue: 1,
      duration: TOTAL_FADE_MS,
      useNativeDriver: false,
    })
    bgRef.current = bg
    bg.start()

    // Content: fade-out → swap tokens → fade-in. Native driver is fine for
    // opacity, keeping the fade on the UI thread.
    const fadeOut = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    })
    fadeOutRef.current = fadeOut
    fadeOut.start(({ finished }) => {
      if (!finished) return
      // Swap descendants to the new theme while they're invisible.
      setRenderedThemeName(desiredThemeName)
      const fadeIn = Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      })
      fadeInRef.current = fadeIn
      fadeIn.start()
    })
  }, [desiredThemeName, renderedThemeName, opacity, bgProgress])

  const value = useMemo<ThemeContextValue>(
    () => makeValue(resolveMobileTheme(renderedThemeName), renderedThemeName),
    [renderedThemeName],
  )

  if (fillParent) {
    const toAppBg = resolveMobileTheme(desiredThemeName).appBg
    const backdropColor = bgProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [fromAppBg, toAppBg],
    })
    return (
      <ThemeContext.Provider value={value}>
        <StatusBar style={value.tokens.statusBarStyle} />
        <Animated.View style={{ flex: 1, backgroundColor: backdropColor }}>
          <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
        </Animated.View>
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
