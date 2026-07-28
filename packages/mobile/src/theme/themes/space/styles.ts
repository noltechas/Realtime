import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Space stylesheet — instrument-panel typography on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING. This theme mounts a single
// Filament scene behind the whole navigator via `ui.SceneLayer` (see
// theme/types.ts). If either of these painted `appBg`, the screens would cover
// the 3D outboard view and the theme would collapse to a flat dark app. The
// animated backdrop in ThemeCrossfade already guarantees there is never a
// see-through hole behind them.
//
// Type: Chakra Petch caps for anything that labels a control (it is a display
// face and gets illegible below ~10px, so it is never used for prose), Exo 2
// for body copy, Share Tech Mono for every numeral the user reads as telemetry.
// Glow is applied sparingly — a hairline text shadow at low alpha to suggest a
// backlit panel, not the heavy neon bloom the previous space theme used.
export function buildSpaceStyles(t: ThemeTokens): ThemeUIStyles {
  const sheet = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    page: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 48,
      backgroundColor: 'transparent',
      flexGrow: 1,
    },
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 26,
      color: t.black,
      letterSpacing: 4,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(91,233,255,0.35)',
      textShadowRadius: 10,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 18,
      color: t.black,
      letterSpacing: 2.6,
      textTransform: 'uppercase',
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
    // Plain-View fallback surface for the few screens that style a card
    // directly instead of going through `MachinedPanel`. Kept visually close to
    // a panel — glass fill, powered hairline — but without the chamfer, which
    // needs a measured SVG.
    card: {
      backgroundColor: 'rgba(13,20,29,0.90)',
      borderWidth: 1,
      borderColor: 'rgba(91,233,255,0.22)',
      borderRadius: 3,
      padding: 16,
    },
    input: {
      backgroundColor: 'rgba(7,12,19,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(91,233,255,0.28)',
      borderRadius: 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    // Readout chip — square, not a pill. Nothing on a machined panel is round.
    pillBox: {
      borderRadius: 2,
      borderWidth: 1,
      borderColor: 'rgba(91,233,255,0.34)',
      backgroundColor: 'rgba(91,233,255,0.07)',
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: 'ShareTechMono_400Regular',
      fontSize: 12,
      color: t.accentA,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 10,
      letterSpacing: 3.4,
      color: t.muted,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
  })

  return sheet
}
