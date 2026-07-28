import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Psychedelic stylesheet — poster lettering over real liquid-light footage.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING. The video is mounted once
// behind the whole navigator via `ui.SceneLayer` (see theme/types.ts); if either
// of these painted `appBg` the screens would cover it and the theme would collapse
// to a flat dark app. ThemeCrossfade's animated backdrop guarantees there is never
// a see-through hole behind them.
//
// Type sits either on glass or directly on footage. Anything on footage gets a
// shadow (see ON_FOOTAGE_SHADOW in atoms/_glass.tsx) because the video reaches
// pure white and text may never depend on its luminance.
export function buildPsychedelicStyles(t: ThemeTokens): ThemeUIStyles {
  const sheet = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    page: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 48,
      backgroundColor: 'transparent',
      flexGrow: 1,
    },
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 36,
      lineHeight: 43,
      color: t.black,
      textShadowColor: 'rgba(0,0,0,0.75)',
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 1 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 24,
      color: t.black,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 1 },
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 15,
      color: t.black,
      lineHeight: 22,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 13,
      color: t.muted,
      lineHeight: 19,
    },
    // Plain-View fallback for screens that style a card directly instead of going
    // through `GlassPanel`. Same glass values, minus the sheen and hairline layers.
    card: {
      backgroundColor: 'rgba(16,12,24,0.66)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      borderRadius: 20,
      padding: 16,
    },
    input: {
      backgroundColor: 'rgba(6,4,10,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      paddingHorizontal: 11,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: t.fontBody,
      fontSize: 12,
      fontWeight: '700',
      color: t.black,
    },
    sectionLabel: {
      fontFamily: t.fontBody,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: t.muted,
      marginBottom: 12,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 1 },
    },
  })

  return sheet
}
