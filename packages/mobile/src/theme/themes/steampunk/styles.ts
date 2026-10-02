import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { ABRIL, BRASS_DEEP, BRASS_HI, ENAMEL, OLD, OLD_B, PARCHMENT, PARCHMENT_DIM } from './atoms/_engine'

// Steampunk stylesheet: the type of an engine's nameplates, on transparent
// screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: the engine house (the
// hall, the window and its airships, the gears along the foot) is a single
// SceneLayer mounted once behind the whole navigator. If these painted
// `appBg` they would cover it.
export function buildSteampunkStyles(t: ThemeTokens): ThemeUIStyles {
  return StyleSheet.create({
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
      fontFamily: ABRIL,
      fontSize: 32,
      lineHeight: 40,
      color: BRASS_HI,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 1.5 },
      textShadowRadius: 0.5,
    },
    h2: {
      fontFamily: ABRIL,
      fontSize: 22,
      lineHeight: 28,
      color: t.black,
    },
    body: {
      fontFamily: OLD,
      fontSize: 16,
      color: t.black,
      lineHeight: 23,
    },
    muted: {
      fontFamily: OLD,
      fontSize: 14,
      color: PARCHMENT_DIM,
      lineHeight: 20,
    },
    // Plain-View fallback for screens that style a card directly: an enamel
    // panel with a brass edge.
    card: {
      backgroundColor: ENAMEL,
      borderWidth: 2,
      borderColor: BRASS_DEEP,
      borderRadius: 6,
      padding: 16,
    } as ViewStyle,
    input: {
      backgroundColor: '#0C0907',
      borderWidth: 1.5,
      borderColor: BRASS_DEEP,
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 17,
      fontFamily: OLD,
      color: PARCHMENT,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: BRASS_DEEP,
      backgroundColor: 'rgba(201,161,90,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: OLD_B,
      fontSize: 10,
      color: BRASS_HI,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: OLD_B,
      fontSize: 12,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: BRASS_HI,
      marginBottom: 12,
    },
  })
}
